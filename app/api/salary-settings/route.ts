import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 時給設定を取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    // add_chargesテーブルから時給設定を取得
    const result = await client.query(
      `SELECT charge_name, value FROM add_charges 
       WHERE charge_name IN ('standard_date', 'regular', 'arubaito')
       ORDER BY charge_name`
    );

    const settings: any = {
      standard_date: 1,
      regular: 0,
      arubaito: 0
    };

    result.rows.forEach((row: any) => {
      if (row.charge_name === 'standard_date') {
        settings.standard_date = parseInt(row.value) || 1;
      } else if (row.charge_name === 'regular') {
        settings.regular = parseFloat(row.value) || 0;
      } else if (row.charge_name === 'arubaito') {
        settings.arubaito = parseFloat(row.value) || 0;
      }
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('時給設定取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '時給設定の取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 時給設定を保存
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { standard_date, regular, arubaito } = await request.json();

    if (standard_date === undefined || regular === undefined || arubaito === undefined) {
      return NextResponse.json(
        { success: false, error: 'すべての項目が必要です' },
        { status: 400 }
      );
    }

    if (standard_date < 1 || standard_date > 7) {
      return NextResponse.json(
        { success: false, error: '基準日は1～7日の範囲で指定してください' },
        { status: 400 }
      );
    }

    if (regular < 0 || arubaito < 0) {
      return NextResponse.json(
        { success: false, error: '時給は0以上の値を指定してください' },
        { status: 400 }
      );
    }

    // add_chargesテーブルに保存（UPSERT）
    await client.query(`
      INSERT INTO add_charges (charge_name, value)
      VALUES ('standard_date', $1)
      ON CONFLICT (charge_name) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
    `, [standard_date]);

    await client.query(`
      INSERT INTO add_charges (charge_name, value)
      VALUES ('regular', $1)
      ON CONFLICT (charge_name) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
    `, [regular]);

    await client.query(`
      INSERT INTO add_charges (charge_name, value)
      VALUES ('arubaito', $1)
      ON CONFLICT (charge_name) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
    `, [arubaito]);

    return NextResponse.json({ success: true, message: '時給設定を保存しました' });
  } catch (error) {
    console.error('時給設定保存エラー:', error);
    return NextResponse.json(
      { success: false, error: '時給設定の保存に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 前週の出勤日数に基づいて時給を自動更新
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    // 前週の開始日と終了日を計算（7日間）
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - 1); // 昨日
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // 7日前

    // add_chargesテーブルから基準日と時給を取得
    const settingsResult = await client.query(
      `SELECT charge_name, value FROM add_charges 
       WHERE charge_name IN ('standard_date', 'regular', 'arubaito')`
    );

    let standardDate = 1;
    let regularWage = 0;
    let arubaitoWage = 0;

    settingsResult.rows.forEach((row: any) => {
      if (row.charge_name === 'standard_date') {
        standardDate = parseInt(row.value) || 1;
      } else if (row.charge_name === 'regular') {
        regularWage = parseFloat(row.value) || 0;
      } else if (row.charge_name === 'arubaito') {
        arubaitoWage = parseFloat(row.value) || 0;
      }
    });

    // 前週の出勤日数を各キャストごとに取得
    const attendanceResult = await client.query(
      `SELECT staff_id, COUNT(DISTINCT DATE(clock_in)) as attendance_days
       FROM attendance
       WHERE clock_in >= $1 
         AND clock_in < $2
         AND status = 'saved'
       GROUP BY staff_id`,
      [lastWeekStart.toISOString(), new Date(lastWeekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString()]
    );

    // 各キャストの時給を更新
    for (const row of attendanceResult.rows) {
      const castId = row.staff_id;
      const attendanceDays = parseInt(row.attendance_days) || 0;
      
      // 基準日数以上ならレギュラー、未満ならアルバイト
      const hourlyPrice = attendanceDays >= standardDate ? regularWage : arubaitoWage;

      await client.query(
        `UPDATE "user" SET hourly_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [hourlyPrice, castId]
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `${attendanceResult.rows.length}名のキャストの時給を更新しました` 
    });
  } catch (error) {
    console.error('時給自動更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '時給の自動更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

