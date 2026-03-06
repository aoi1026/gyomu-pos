import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

async function ensureProjectVariableTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS project_variable (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      value TEXT,
      other TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_project_variable_name ON project_variable(name)
  `);

  // トリガー関数が存在するかチェック
  const triggerFunctionExists = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_updated_at_column'
    ) as function_exists
  `);

  if (!triggerFunctionExists.rows[0].function_exists) {
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
  }

  // トリガーが存在するかチェック
  const triggerExists = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'update_project_variable_updated_at'
    ) as trigger_exists
  `);

  if (!triggerExists.rows[0].trigger_exists) {
    await client.query(`
      CREATE TRIGGER update_project_variable_updated_at 
      BEFORE UPDATE ON project_variable 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  // 初期データを挿入（存在しない場合）
  await client.query(`
    INSERT INTO project_variable (name, value, other)
    VALUES 
      ('store_name', '銀座エレガンス', '店舗名'),
      ('store_address', '', '店舗住所'),
      ('store_tel', '', '店舗電話番号'),
      ('receipt_greeting', 'ありがとうございます。\nまたのご来店をお待ちしております。', '領収書挨拶文（改行可）'),
      ('store_id', '', '店舗ID（領収書最下部）')
    ON CONFLICT (name) DO NOTHING
  `);
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureProjectVariableTable(client);

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (name) {
      // 特定の変数を取得
      const result = await client.query(
        `SELECT id, name, value, other, created_at, updated_at 
         FROM project_variable 
         WHERE name = $1`,
        [name]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '変数が見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: result.rows[0] });
    } else {
      // すべての変数を取得
      const result = await client.query(
        `SELECT id, name, value, other, created_at, updated_at 
         FROM project_variable 
         ORDER BY name`
      );

      return NextResponse.json({ success: true, data: result.rows });
    }
  } catch (error) {
    console.error('プロジェクト変数取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'プロジェクト変数の取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureProjectVariableTable(client);

    const { name, value, other } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'nameは必須です' },
        { status: 400 }
      );
    }

    // レコードが存在するかチェック
    const checkResult = await client.query(
      `SELECT id FROM project_variable WHERE name = $1`,
      [name]
    );

    if (checkResult.rows.length === 0) {
      // レコードが存在しない場合は作成
      const insertResult = await client.query(
        `INSERT INTO project_variable (name, value, other)
         VALUES ($1, $2, $3)
         RETURNING id, name, value, other, created_at, updated_at`,
        [name, value || null, other || null]
      );

      return NextResponse.json({ success: true, data: insertResult.rows[0] });
    } else {
      // レコードが存在する場合は更新
      const updateResult = await client.query(
        `UPDATE project_variable 
         SET value = COALESCE($2, value), 
             other = COALESCE($3, other)
         WHERE name = $1
         RETURNING id, name, value, other, created_at, updated_at`,
        [name, value, other]
      );

      return NextResponse.json({ success: true, data: updateResult.rows[0] });
    }
  } catch (error) {
    console.error('プロジェクト変数更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'プロジェクト変数の更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

