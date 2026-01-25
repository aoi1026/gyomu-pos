import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { attendance_status } = await request.json();
    const castId = params.id;

    if (attendance_status === undefined) {
      return NextResponse.json(
        { success: false, error: '出勤状態が必要です' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE "user" SET attendance_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND role = $3 RETURNING id, name, mail, attendance_status',
        [attendance_status, castId, 'cast']
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'キャストが見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('出勤状態更新エラー:', error);
      return NextResponse.json(
        { success: false, error: '出勤状態の更新に失敗しました' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('出勤状態更新エラー(リクエスト解析):', error);
    return NextResponse.json(
      { success: false, error: '不正なリクエストです' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, mail, password, other, gender } = await request.json();
    const castId = params.id;

    if (!name || !mail) {
      return NextResponse.json(
        { error: '名前とメールアドレスを入力してください。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // genderカラムが存在するか確認し、存在しない場合は追加
      await client.query(`
        ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
      `);

      let query, values;
      
      if (password) {
        // パスワードも更新する場合
        const { hashPassword } = await import('@/lib/hash');
        const hashedPassword = hashPassword(password);
        
        query = 'UPDATE "user" SET name = $1, mail = $2, password = $3, other = $4, gender = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND role = $7 RETURNING id, name, mail, other, gender, created_at';
        values = [name, mail, hashedPassword, other || '', gender || null, castId, 'cast'];
      } else {
        // パスワードは更新しない場合
        query = 'UPDATE "user" SET name = $1, mail = $2, other = $3, gender = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND role = $6 RETURNING id, name, mail, other, gender, created_at';
        values = [name, mail, other || '', gender || null, castId, 'cast'];
      }

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'キャストが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'キャスト情報が正常に更新されました',
        data: result.rows[0]
      });

    } catch (error: any) {
      if (error.code === '23505') { // 一意制約違反
        return NextResponse.json(
          { error: 'このメールアドレスは既に使用されています。' },
          { status: 409 }
        );
      }
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('キャスト更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const castId = params.id;
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM "user" WHERE id = $1 AND role = $2 RETURNING id, name',
        [castId, 'cast']
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'キャストが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'キャストが正常に削除されました',
        data: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('キャスト削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
