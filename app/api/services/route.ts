import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// GET - サービス一覧を取得
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, name, other, created_at, updated_at 
      FROM services 
      ORDER BY created_at DESC
    `);
    
    return NextResponse.json({
      success: true,
      services: result.rows
    });
  } catch (error) {
    console.error('サービス取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'サービス一覧の取得に失敗しました'
    }, { status: 500 });
  }
}

// POST - 新しいサービスを追加
export async function POST(request: NextRequest) {
  try {
    const { name, other } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'サービス名は必須です'
      }, { status: 400 });
    }
    
    const result = await pool.query(`
      INSERT INTO services (name, other) 
      VALUES ($1, $2) 
      RETURNING id, name, other, created_at, updated_at
    `, [name.trim(), other || null]);
    
    return NextResponse.json({
      success: true,
      service: result.rows[0],
      message: 'サービスが正常に追加されました'
    });
  } catch (error) {
    console.error('サービス追加エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'サービスの追加に失敗しました'
    }, { status: 500 });
  }
}
