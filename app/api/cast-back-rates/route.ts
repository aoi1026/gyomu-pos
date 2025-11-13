import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

async function ensureBackRateColumns(client: any) {
	await client.query(`
		ALTER TABLE "user" 
		ADD COLUMN IF NOT EXISTS hourly_price DECIMAL(10,2) DEFAULT 0.00 CHECK (hourly_price >= 0)
	`);
	await client.query(`
		ALTER TABLE "user" 
		ADD COLUMN IF NOT EXISTS together_nomination DECIMAL(5,2) DEFAULT 0.00 CHECK (together_nomination >= 0 AND together_nomination <= 100)
	`);
}

export async function GET() {
	const client = await pool.connect();
	try {
		await ensureBackRateColumns(client);
    const result = await client.query(`
			SELECT 
				id,
				name,
				mail AS email,
				food_back,
				drink_back,
				main_nomination,
				inside_nomination,
				together_nomination,
				hourly_price,
				created_at
			FROM "user"
			WHERE role = 'cast'
			ORDER BY name
		`);

    const casts = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      food_back: row.food_back !== null ? parseFloat(row.food_back) : 0,
      drink_back: row.drink_back !== null ? parseFloat(row.drink_back) : 0,
      main_nomination: row.main_nomination !== null ? parseFloat(row.main_nomination) : 0,
      inside_nomination: row.inside_nomination !== null ? parseFloat(row.inside_nomination) : 0,
      together_nomination: row.together_nomination !== null ? parseFloat(row.together_nomination) : 0,
      hourly_price: row.hourly_price !== null ? parseFloat(row.hourly_price) : 0,
      created_at: row.created_at
    }));

    return NextResponse.json({ success: true, casts });
	} catch (error) {
		console.error('バック率取得エラー:', error);
		return NextResponse.json({ success: false, error: 'キャストの取得に失敗しました' }, { status: 500 });
	} finally {
		client.release();
	}
}

export async function PUT(request: NextRequest) {
	const client = await pool.connect();
	try {
		await ensureBackRateColumns(client);
		const { castId, drinkBack, bottleBack, mainNomination, insideNomination, togetherNomination, hourlyPrice } = await request.json();
		if (!castId) {
			return NextResponse.json({ success: false, error: 'castIdが必要です' }, { status: 400 });
		}

		const updates: string[] = [];
		const params: any[] = [];
		let p = 1;
		if (drinkBack !== undefined) { updates.push(`food_back = $${p++}`); params.push(drinkBack); }
		if (bottleBack !== undefined) { updates.push(`drink_back = $${p++}`); params.push(bottleBack); }
		if (mainNomination !== undefined) { updates.push(`main_nomination = $${p++}`); params.push(mainNomination); }
		if (insideNomination !== undefined) { updates.push(`inside_nomination = $${p++}`); params.push(insideNomination); }
		if (togetherNomination !== undefined) { updates.push(`together_nomination = $${p++}`); params.push(togetherNomination); }
		if (hourlyPrice !== undefined) { updates.push(`hourly_price = $${p++}`); params.push(hourlyPrice); }

		if (updates.length === 0) {
			return NextResponse.json({ success: false, error: '更新項目がありません' }, { status: 400 });
		}

		params.push(castId);
		const query = `UPDATE "user" SET ${updates.join(', ')} WHERE id = $${p} AND role = 'cast' RETURNING *`;
		const result = await client.query(query, params);
		if (result.rowCount === 0) {
			return NextResponse.json({ success: false, error: '対象キャストが見つかりません' }, { status: 404 });
		}
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('バック率更新エラー:', error);
		return NextResponse.json({ success: false, error: 'バック率の更新に失敗しました' }, { status: 500 });
	} finally {
		client.release();
	}
}
