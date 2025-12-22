import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

function payTypeLabel(v: any) {
  const n = v === null || v === undefined ? null : Number(v);
  if (n === 0) return '店舗用クレジットカード';
  if (n === 1) return '現金';
  if (n === 2) return 'クレジットカード';
  return '-';
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const tableId = Number(searchParams.get('table_id'));
    const date = String(searchParams.get('date') || ''); // YYYY-MM-DD

    if (!Number.isFinite(tableId) || tableId <= 0) {
      return NextResponse.json({ success: false, error: 'table_id が不正です' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ success: false, error: 'date が必要です' }, { status: 400 });
    }

    // 旧DB向けの最低限の保険
    await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pay_type INTEGER`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_payments (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        pay_type INTEGER NOT NULL CHECK (pay_type IN (0, 1, 2)),
        amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await client.query(
      `
      WITH charges AS (
        SELECT COALESCE(value, 0) AS extension_price
        FROM add_charges
        WHERE charge_name = 'extension_price'
        LIMIT 1
      ),
      set_charge AS (
        SELECT COALESCE(value, 0) AS set_price
        FROM add_charges
        WHERE charge_name = 'set_price'
        LIMIT 1
      ),
      sess AS (
        SELECT
          s.id,
          s.table_id,
          s.cost,
          s.created_at,
          s.end_at,
          s.pay_type,
          s.client,
          s.set_count
        FROM sessions s
        WHERE s.table_id = $1
          AND s.end_at IS NOT NULL
          AND s.end_at::date = $2::date
        ORDER BY s.end_at DESC, s.id DESC
      ),
      item_rows AS (
        -- セット料金（セッション開始時）
        SELECT
          s.id AS session_id,
          8 AS sort_key,
          'セット'::text AS category,
          'セット料金'::text AS name,
          (SELECT set_price FROM set_charge) AS unit_price,
          COALESCE(s.client, 0)::int AS quantity,
          ((SELECT set_price FROM set_charge) * COALESCE(s.client, 0)) AS total,
          NULL::text AS unit_price_note
        FROM sess s

        UNION ALL
        -- 決済履歴（session_payments）
        SELECT
          sp.session_id,
          5 AS sort_key,
          '決済'::text AS category,
          CASE
            WHEN sp.pay_type = 0 THEN '店舗用クレジットカード'
            WHEN sp.pay_type = 1 THEN '現金'
            WHEN sp.pay_type = 2 THEN 'クレジットカード'
            ELSE '不明'
          END AS name,
          COALESCE(sp.amount, 0) AS unit_price,
          1::int AS quantity,
          COALESCE(sp.amount, 0) AS total,
          NULL::text AS unit_price_note
        FROM session_payments sp
        INNER JOIN sess s ON s.id = sp.session_id

        UNION ALL
        -- 延長（数量は set_count - 1、総金額は 延長単価 * 人数(client) * 延長数）
        SELECT
          s.id AS session_id,
          10 AS sort_key,
          '延長'::text AS category,
          '60分延長'::text AS name,
          (SELECT extension_price FROM charges) AS unit_price,
          GREATEST(COALESCE(s.set_count, 0)::int - 1, 0) AS quantity,
          ((SELECT extension_price FROM charges) * COALESCE(s.client, 0) * GREATEST(COALESCE(s.set_count, 0)::int - 1, 0)) AS total,
          ('(' || COALESCE(s.client, 0)::int || '名)')::text AS unit_price_note
        FROM sess s

        UNION ALL
        -- 製品注文（accepted のみ）
        SELECT
          so.session_id,
          20,
          '注文'::text,
          p.name::text,
          COALESCE(so.unit_price, 0),
          COALESCE(so.amount, 0)::int,
          COALESCE(so.total_price, COALESCE(so.unit_price, 0) * COALESCE(so.amount, 0)),
          NULL::text AS unit_price_note
        FROM salesorder so
        INNER JOIN sess s ON s.id = so.session_id
        INNER JOIN product p ON p.id = so.product_id
        WHERE so.status = 'accepted'

        UNION ALL
        -- サービス注文（accepted のみ、金額は0）
        SELECT
          sv.session_id,
          30,
          '注文'::text,
          se.name::text,
          0::numeric,
          COALESCE(sv.amount, 0)::int,
          0::numeric,
          NULL::text AS unit_price_note
        FROM serviceorder sv
        INNER JOIN sess s ON s.id = sv.session_id
        INNER JOIN services se ON se.id = sv.service_id
        WHERE sv.status = 'accepted'

        UNION ALL
        -- 追加サービス（typeを名前として、unit=charge/count, total=charge）
        SELECT
          a.session_id,
          40,
          '注文'::text,
          a.service_type::text,
          CASE WHEN COALESCE(a.count, 0) > 0 THEN COALESCE(a.charge, 0) / a.count ELSE 0 END,
          COALESCE(a.count, 0)::int,
          COALESCE(a.charge, 0),
          NULL::text AS unit_price_note
        FROM additional_services a
        INNER JOIN sess s ON s.id = a.session_id

        UNION ALL
        -- 指名（数量は表示しない想定なので NULL）
        SELECT
          n.session_id,
          50,
          '指名'::text,
          CASE
            WHEN n.type_id = 'inside' THEN '場内指名'
            WHEN n.type_id = 'main' THEN '本指名'
            WHEN n.type_id = 'together' THEN '同伴指名'
            ELSE n.type_id::text
          END AS name,
          COALESCE(n.cost, 0),
          NULL::int,
          COALESCE(n.cost, 0),
          NULL::text AS unit_price_note
        FROM nomination n
        INNER JOIN sess s ON s.id = n.session_id
      ),
      items AS (
        SELECT
          session_id,
          jsonb_agg(
            jsonb_build_object(
              'category', category,
              'name', name,
              'unit_price', unit_price,
              'unit_price_note', unit_price_note,
              'quantity', quantity,
              'total', total
            )
            ORDER BY sort_key, name
          ) AS items,
          COALESCE(SUM(total), 0) AS total_calc
        FROM item_rows
        GROUP BY session_id
      ),
      casts AS (
        SELECT
          n.session_id,
          jsonb_agg(
            jsonb_build_object(
              'cast_id', n.cast_id,
              'cast_name', u.name,
              'type_id', CASE
                WHEN n.type_id = 'inside' THEN '場内指名'
                WHEN n.type_id = 'main' THEN '本指名'
                WHEN n.type_id = 'together' THEN '同伴指名'
                ELSE n.type_id::text
              END
            )
            ORDER BY n.id
          ) AS cast_list
        FROM nomination n
        INNER JOIN sess s ON s.id = n.session_id
        LEFT JOIN "user" u ON u.id = n.cast_id
        GROUP BY n.session_id
      )
      SELECT
        s.id,
        s.table_id,
        s.cost,
        s.created_at,
        s.end_at,
        s.pay_type,
        s.client,
        s.set_count,
        COALESCE(i.items, '[]'::jsonb) AS items,
        COALESCE(i.total_calc, 0) AS total_calc,
        COALESCE(c.cast_list, '[]'::jsonb) AS cast_list
      FROM sess s
      LEFT JOIN items i ON i.session_id = s.id
      LEFT JOIN casts c ON c.session_id = s.id
      ORDER BY s.end_at DESC, s.id DESC
      `,
      [tableId, date]
    );

    const sessions = result.rows.map((r: any) => ({
      ...r,
      pay_type_label: payTypeLabel(r.pay_type),
    }));

    return NextResponse.json({ success: true, data: { table_id: tableId, date, sessions } });
  } catch (error) {
    console.error('日次売上テーブル詳細取得エラー:', error);
    return NextResponse.json({ success: false, error: '詳細データの取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


