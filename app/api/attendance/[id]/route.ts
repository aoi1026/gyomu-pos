import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { clock_in, clock_out, total_work_hours, comment, status, approved_by } = await request.json();

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

      // clock_inが更新される場合、新しいclock_inを使用
      const finalClockIn = clock_in || before.clock_in;
      
      // clock_outが指定されている、または既に存在する場合、total_work_hoursを自動計算
      const finalClockOut = clock_out || before.clock_out;
      let finalTotalWorkHours = total_work_hours;
      const shouldRecalculateHours = (clock_in || clock_out) && finalClockOut && finalClockIn;
      if (shouldRecalculateHours) {
        const clockInTime = new Date(finalClockIn);
        const clockOutTime = new Date(finalClockOut);
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60); // ミリ秒を時間に変換
        finalTotalWorkHours = Math.round(diffHours * 100) / 100; // 小数点2桁まで
      }

      // UPDATEクエリを構築
      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let paramIndex = 1;

      if (clock_in) {
        updateFields.push(`clock_in = $${paramIndex}`);
        updateParams.push(clock_in);
        paramIndex++;
      }

      if (clock_out) {
        updateFields.push(`clock_out = $${paramIndex}`);
        updateParams.push(clock_out);
        paramIndex++;
      }

      // total_work_hoursが明示的に指定されているか、clock_in/clock_outが更新されて再計算が必要な場合
      if (total_work_hours !== undefined || shouldRecalculateHours) {
        updateFields.push(`total_work_hours = $${paramIndex}`);
        updateParams.push(finalTotalWorkHours !== undefined ? finalTotalWorkHours : (before.total_work_hours || 0));
        paramIndex++;
      }

      if (comment !== undefined) {
        updateFields.push(`comment = $${paramIndex}`);
        updateParams.push(comment);
        paramIndex++;
      }

      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateParams.push(status);
        paramIndex++;
      }

      if (approved_by !== undefined) {
        updateFields.push(`approved_by = $${paramIndex}`);
        updateParams.push(approved_by);
        paramIndex++;
        updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: '更新する項目が指定されていません。' },
          { status: 400 }
        );
      }

      const updateQuery = `
        UPDATE attendance
           SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *
      `;
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

      // 既に確定(saved)だったレコードの時刻・工数が変わった場合、給与の basic_hours / base_pay を差し替え
      if (prevStatus === 'saved') {
        const updated = result.rows[0];
        const staffId = Number(before.staff_id);
        const hourlyRes = await client.query(`SELECT hourly_price FROM "user" WHERE id = $1`, [staffId]);
        const hourlyPrice = Number(hourlyRes.rows[0]?.hourly_price) || 0;

        const oldH = Number(before.total_work_hours) || 0;
        const newH = Number(updated.total_work_hours) || 0;

        const oldCi = new Date(before.clock_in);
        const newCi = new Date(updated.clock_in);
        const oy = oldCi.getFullYear();
        const om = oldCi.getMonth() + 1;
        const ny = newCi.getFullYear();
        const nm = newCi.getMonth() + 1;

        const adjustSalaryMonth = async (
          year: number,
          month: number,
          hoursDelta: number,
          payDelta: number
        ) => {
          if (hoursDelta === 0 && payDelta === 0) return;
          const ex = await client.query(
            `SELECT 1 FROM salary WHERE user_id = $1 AND year = $2 AND month = $3`,
            [staffId, year, month]
          );
          if (ex.rows.length === 0 && hoursDelta > 0) {
            await client.query(
              `INSERT INTO salary (user_id, year, month, basic_hours, base_pay)
               VALUES ($1, $2, $3, $4, $5)`,
              [staffId, year, month, hoursDelta, payDelta]
            );
            return;
          }
          if (ex.rows.length === 0) return;
          await client.query(
            `UPDATE salary SET
              basic_hours = GREATEST(0, COALESCE(basic_hours, 0) + $4),
              base_pay = GREATEST(0, COALESCE(base_pay, 0) + $5)
             WHERE user_id = $1 AND year = $2 AND month = $3`,
            [staffId, year, month, hoursDelta, payDelta]
          );
        };

        if (oy === ny && om === nm) {
          const dh = newH - oldH;
          if (dh !== 0) {
            await adjustSalaryMonth(ny, nm, dh, dh * hourlyPrice);
          }
        } else {
          if (oldH !== 0) {
            await adjustSalaryMonth(oy, om, -oldH, -oldH * hourlyPrice);
          }
          if (newH !== 0) {
            await adjustSalaryMonth(ny, nm, newH, newH * hourlyPrice);
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const allowCompleted = searchParams.get('allow_completed') === '1';

    const client = await pool.connect();

    try {
      if (!allowCompleted) {
        const result = await client.query(
          'DELETE FROM attendance WHERE id = $1 AND clock_out IS NULL RETURNING *',
          [id]
        );

        if (result.rows.length === 0) {
          const exists = await client.query('SELECT id FROM attendance WHERE id = $1', [id]);
          if (exists.rows.length > 0) {
            return NextResponse.json(
              { success: false, error: 'すでに退勤済みのため、この出勤記録は取り消せません。' },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { success: false, error: '勤怠データが見つかりません。' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: '勤怠データが正常に削除されました'
        });
      }

      await client.query('BEGIN');
      const sel = await client.query(
        `SELECT id, staff_id, status, clock_in, total_work_hours
         FROM attendance WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (sel.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: '勤怠データが見つかりません。' },
          { status: 404 }
        );
      }

      const row = sel.rows[0];
      if (String(row.status) === 'saved' && row.clock_in && Number(row.total_work_hours) > 0) {
        const staffId = Number(row.staff_id);
        const hours = Number(row.total_work_hours);
        const ci = new Date(row.clock_in as string);
        const y = ci.getFullYear();
        const m = ci.getMonth() + 1;
        const hourlyRes = await client.query(`SELECT hourly_price FROM "user" WHERE id = $1`, [staffId]);
        const hp = Number(hourlyRes.rows[0]?.hourly_price) || 0;
        const pay = hours * hp;
        await client.query(
          `UPDATE salary SET
            basic_hours = GREATEST(0, COALESCE(basic_hours, 0) - $1),
            base_pay = GREATEST(0, COALESCE(base_pay, 0) - $2)
           WHERE user_id = $3 AND year = $4 AND month = $5`,
          [hours, pay, staffId, y, m]
        );
      }

      await client.query('DELETE FROM attendance WHERE id = $1', [id]);
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: '勤怠データが正常に削除されました'
      });
    } catch (error: any) {
      console.error('勤怠データ削除エラー:', error);
      try {
        await client.query('ROLLBACK');
      } catch {
        /* noop */
      }
      return NextResponse.json(
        { success: false, error: '勤怠データの削除に失敗しました。' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('勤怠データ削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
