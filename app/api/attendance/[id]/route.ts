import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { clock_out, total_work_hours, comment, status, approved_by } = await request.json();

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 既存レコードをロックして取得（saved遷移の重複加算防止）
      const beforeRes = await client.query(
        `
        SELECT
          id,
          staff_id,
          status,
          clock_in,
          clock_out,
          total_work_hours,
          EXTRACT(YEAR FROM clock_in)::int AS year,
          EXTRACT(MONTH FROM clock_in)::int AS month
        FROM attendance
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

      if (beforeRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: '勤怠データが見つかりません。' },
          { status: 404 }
        );
      }

      const before = beforeRes.rows[0];
      const prevStatus = String(before.status || 'pending');

      // clock_outが指定されている場合、total_work_hoursを自動計算
      let finalTotalWorkHours = total_work_hours;
      if (clock_out && before.clock_in) {
        const clockInTime = new Date(before.clock_in);
        const clockOutTime = new Date(clock_out);
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60); // ミリ秒を時間に変換
        finalTotalWorkHours = Math.round(diffHours * 100) / 100; // 小数点2桁まで
      }

      // UPDATEクエリを構築（clock_outが指定されている場合のみ更新）
      let updateQuery = `
        UPDATE attendance
           SET total_work_hours = $1,
               comment = $2,
               status = $3,
               approved_by = $4,
               approved_at = CURRENT_TIMESTAMP
      `;
      const updateParams: any[] = [finalTotalWorkHours, comment, status, approved_by];

      if (clock_out) {
        updateQuery = `
          UPDATE attendance
             SET clock_out = $5,
                 total_work_hours = $1,
                 comment = $2,
                 status = $3,
                 approved_by = $4,
                 approved_at = CURRENT_TIMESTAMP
        `;
        updateParams.push(clock_out);
      }

      updateQuery += ` WHERE id = $${updateParams.length + 1} RETURNING *`;
      updateParams.push(id);

      const result = await client.query(updateQuery, updateParams);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: '勤怠データが見つかりません。' },
          { status: 404 }
        );
      }

      // status が saved になった瞬間に、salary.basic_hours へ total_work_hours を加算
      const nextStatus = String(status || prevStatus);
      if (nextStatus === 'saved' && prevStatus !== 'saved') {
        const staffId = Number(before.staff_id);
        const year = Number(before.year);
        const month = Number(before.month);
        const hours = Number(total_work_hours ?? before.total_work_hours ?? 0);

        if (Number.isFinite(staffId) && staffId > 0 && Number.isFinite(year) && Number.isFinite(month)) {
          if (Number.isFinite(hours) && hours > 0) {
            // 時給を取得して base_pay を算出
            const hourlyRes = await client.query(
              `SELECT hourly_price FROM "user" WHERE id = $1`,
              [staffId]
            );
            const hourlyPrice = Number(hourlyRes.rows[0]?.hourly_price) || 0;
            const basePayAdd = hours * (Number.isFinite(hourlyPrice) ? hourlyPrice : 0);

            await client.query(
              `
              INSERT INTO salary (user_id, year, month, basic_hours, base_pay)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, year, month)
              DO UPDATE SET
                basic_hours = COALESCE(salary.basic_hours, 0) + EXCLUDED.basic_hours,
                base_pay = COALESCE(salary.base_pay, 0) + EXCLUDED.base_pay
              `,
              [staffId, year, month, hours, basePayAdd]
            );
          }
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: '勤怠データが正常に更新されました',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('勤怠データ更新エラー:', error);
      try { await client.query('ROLLBACK'); } catch {}
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
