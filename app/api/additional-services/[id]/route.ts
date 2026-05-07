import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'IDが不正です' },
        { status: 400 }
      );
    }

    const result = await client.query(
      'DELETE FROM additional_services WHERE id = $1 RETURNING id',
      [idNum]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: '追加サービスが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('追加サービス削除エラー:', error);
    return NextResponse.json(
      { success: false, error: '追加サービスの削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
