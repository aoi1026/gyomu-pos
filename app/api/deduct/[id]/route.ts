import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await request.json();

    const date = body?.date !== undefined ? String(body.date) : undefined;
    const value =
      body?.value !== undefined ? Number(String(body.value).replace(',', '.')) : undefined;
    const reason = body?.reason !== undefined ? String(body.reason) : undefined;
    const other = body?.other !== undefined ? String(body.other) : undefined;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (date !== undefined) {
      updates.push(`date = $${idx++}`);
      values.push(date);
    }

    if (value !== undefined) {
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json(
          { success: false, error: 'value は0以上の数値が必要です' },
          { status: 400 }
        );
      }
      updates.push(`value = $${idx++}`);
      values.push(value);
    }

    if (reason !== undefined) {
      updates.push(`reason = $${idx++}`);
      values.push(reason || null);
    }

    if (other !== undefined) {
      updates.push(`other = $${idx++}`);
      values.push(other || null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '更新する項目がありません' },
        { status: 400 }
      );
    }

    // テーブルが無い環境でも落ちにくくする（旧DB向けの保険）
    await client.query(`
      CREATE TABLE IF NOT EXISTS deduct (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        value DECIMAL(12,2) NOT NULL CHECK (value >= 0),
        reason TEXT,
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    values.push(id);

    const result = await client.query(
      `UPDATE deduct SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, date::text AS date, value, reason, other, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '経費が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('経費更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '経費の更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;

    // テーブルが無い環境でも落ちにくくする（旧DB向けの保険）
    await client.query(`
      CREATE TABLE IF NOT EXISTS deduct (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        value DECIMAL(12,2) NOT NULL CHECK (value >= 0),
        reason TEXT,
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await client.query(
      'DELETE FROM deduct WHERE id = $1 RETURNING id, date::text AS date, value, reason, other, created_at, updated_at',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '経費が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('経費削除エラー:', error);
    return NextResponse.json(
      { success: false, error: '経費の削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

