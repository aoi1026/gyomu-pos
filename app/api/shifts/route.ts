import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

// GET: シフトデータを取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    let query = `
      SELECT s.id, s.cast_id, s.date, u.name as cast_name
      FROM shift s
      JOIN "user" u ON s.cast_id = u.id
      WHERE u.role = 'cast'
    `;
    
    const values: any[] = [];
    let paramIndex = 1;
    
    if (year && month) {
      query += ` AND EXTRACT(YEAR FROM s.date) = $${paramIndex} AND EXTRACT(MONTH FROM s.date) = $${paramIndex + 1}`;
      values.push(parseInt(year), parseInt(month));
      paramIndex += 2;
    }
    
    query += ` ORDER BY s.cast_id DESC, s.date ASC`;
    
    const result = await client.query(query, values);
    
    // 日付を文字列形式に正規化（YYYY-MM-DD形式）
    const normalizedRows = result.rows.map((row: any) => {
      if (row.date) {
        // PostgreSQLのDATE型は文字列として返される場合が多い
        // タイムゾーンの影響を避けるため、文字列の場合はそのまま使用
        let dateStr: string;
        if (typeof row.date === 'string') {
          dateStr = row.date.split('T')[0];
        } else {
          // Dateオブジェクトの場合は、ローカル時間で日付文字列を生成
          const date = new Date(row.date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
        return { ...row, date: dateStr };
      }
      return row;
    });
    
    return NextResponse.json({
      success: true,
      data: normalizedRows
    });
  } catch (error) {
    console.error('シフトデータ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'シフトデータの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST: シフトを登録
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { cast_id, date } = await request.json();
    
    if (!cast_id || !date) {
      return NextResponse.json(
        { success: false, error: 'cast_idとdateが必要です' },
        { status: 400 }
      );
    }
    
    const result = await client.query(
      'INSERT INTO shift (cast_id, date) VALUES ($1, $2) ON CONFLICT (cast_id, date) DO NOTHING RETURNING *',
      [cast_id, date]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '既に登録されているシフトです' },
        { status: 409 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('シフト登録エラー:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { success: false, error: '存在しないキャストIDです' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'シフトの登録に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE: シフトを削除
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const cast_id = searchParams.get('cast_id');
    const date = searchParams.get('date');
    
    if (!cast_id || !date) {
      return NextResponse.json(
        { success: false, error: 'cast_idとdateが必要です' },
        { status: 400 }
      );
    }
    
    const result = await client.query(
      'DELETE FROM shift WHERE cast_id = $1 AND date = $2 RETURNING *',
      [cast_id, date]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'シフトが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('シフト削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'シフトの削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

