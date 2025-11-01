import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { total_work_hours, comment, status, approved_by } = await request.json();

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE attendance SET total_work_hours = $1, comment = $2, status = $3, approved_by = $4, approved_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        [total_work_hours, comment, status, approved_by, id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '勤怠データが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '勤怠データが正常に更新されました',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('勤怠データ更新エラー:', error);
      return NextResponse.json(
        { error: '勤怠データの更新に失敗しました。' },
        { status: 500 }
      );
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('勤怠データ更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM attendance WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '勤怠データが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '勤怠データが正常に削除されました'
      });

    } catch (error: any) {
      console.error('勤怠データ削除エラー:', error);
      return NextResponse.json(
        { error: '勤怠データの削除に失敗しました。' },
        { status: 500 }
      );
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('勤怠データ削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
