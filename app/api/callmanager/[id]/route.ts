import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, accepted_by } = await request.json();
    const callId = params.id;

    if (!status || !accepted_by) {
      return NextResponse.json(
        { success: false, error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '無効なステータスです' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // callmanagerテーブルのステータスを更新
      const result = await client.query(
        `UPDATE callmanager 
         SET status = $1, accepted_at = CURRENT_TIMESTAMP, accepted_by = $2
         WHERE id = $3 
         RETURNING id, status, accepted_at, accepted_by, session_id`,
        [status, accepted_by, callId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'スタッフ呼び出しが見つかりません' },
          { status: 404 }
        );
      }


      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('スタッフ呼び出し更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'スタッフ呼び出しの更新に失敗しました' },
      { status: 500 }
    );
  }
}
