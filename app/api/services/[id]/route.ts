import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// PUT - サービスを更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, other } = await request.json();
    const { id } = await params;
    const serviceId = parseInt(id);
    
    if (!name || name.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'サービス名は必須です'
      }, { status: 400 });
    }
    
    const result = await pool.query(`
      UPDATE services 
      SET name = $1, other = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, other, created_at, updated_at
    `, [name.trim(), other || null, serviceId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '指定されたサービスが見つかりません'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      service: result.rows[0],
      message: 'サービスが正常に更新されました'
    });
  } catch (error) {
    console.error('サービス更新エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'サービスの更新に失敗しました'
    }, { status: 500 });
  }
}

// DELETE - サービスを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id);
    
    const result = await pool.query(`
      DELETE FROM services 
      WHERE id = $1
      RETURNING id, name
    `, [serviceId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '指定されたサービスが見つかりません'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'サービスが正常に削除されました'
    });
  } catch (error) {
    console.error('サービス削除エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'サービスの削除に失敗しました'
    }, { status: 500 });
  }
}
