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

/** 全キャストへ指名バック率（および任意で時給）を一括設定 */
export async function PATCH(request: NextRequest) {
	const client = await pool.connect();
	try {
		await ensureBackRateColumns(client);
		const body = await request.json();
		const { mainNomination, insideNomination, togetherNomination, hourlyPrice, applyToAllCasts } = body;

		if (!applyToAllCasts) {
			return NextResponse.json({ success: false, error: 'applyToAllCasts が必要です' }, { status: 400 });
		}

		const assertPct = (label: string, v: unknown): number => {
			const n = Number(v);
			if (!Number.isFinite(n) || n < 0 || n > 100) {
				throw new Error(`${label}は0〜100の範囲で指定してください`);
			}
			return n;
		};

		const updates: string[] = [];
		const params: any[] = [];
		let p = 1;

		try {
			if (mainNomination !== undefined && mainNomination !== null) {
				updates.push(`main_nomination = $${p++}`);
				params.push(assertPct('本指名料率', mainNomination));
			}
			if (insideNomination !== undefined && insideNomination !== null) {
				updates.push(`inside_nomination = $${p++}`);
				params.push(assertPct('場内指名料率', insideNomination));
			}
			if (togetherNomination !== undefined && togetherNomination !== null) {
				updates.push(`together_nomination = $${p++}`);
				params.push(assertPct('同伴料率', togetherNomination));
			}
			if (hourlyPrice !== undefined && hourlyPrice !== null) {
				const hp = Number(hourlyPrice);
				if (!Number.isFinite(hp) || hp < 0) {
					return NextResponse.json({ success: false, error: '時給は0以上の数値を指定してください' }, { status: 400 });
				}
				updates.push(`hourly_price = $${p++}`);
				params.push(hp);
			}
		} catch (e) {
			return NextResponse.json(
				{ success: false, error: e instanceof Error ? e.message : '入力が無効です' },
				{ status: 400 }
			);
		}

		if (updates.length === 0) {
			return NextResponse.json(
				{ success: false, error: '本指名・場内・同伴のいずれか、または時給を指定してください' },
				{ status: 400 }
			);
		}

		updates.push('updated_at = CURRENT_TIMESTAMP');
		const query = `UPDATE "user" SET ${updates.join(', ')} WHERE role = 'cast'`;
		const result = await client.query(query, params);

		return NextResponse.json({
			success: true,
			message: `全キャスト（${result.rowCount ?? 0}件）の設定を更新しました`,
			updated: result.rowCount ?? 0,
		});
	} catch (error) {
		console.error('バック率一括更新エラー:', error);
		return NextResponse.json({ success: false, error: 'バック率の一括更新に失敗しました' }, { status: 500 });
	} finally {
		client.release();
	}
}
