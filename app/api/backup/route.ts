import { NextRequest, NextResponse } from 'next/server';
import { createBackup, getBackupFiles } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// 手動バックアップを実行
export async function POST(request: NextRequest) {
  try {
    const result = await createBackup();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'バックアップが完了しました',
        filename: result.filename,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'バックアップに失敗しました',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('バックアップAPIエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'バックアップに失敗しました',
    }, { status: 500 });
  }
}

// バックアップファイルリストを取得
export async function GET(request: NextRequest) {
  try {
    const files = await getBackupFiles();
    
    return NextResponse.json({
      success: true,
      files: files.map(file => ({
        filename: file.filename,
        size: file.size,
        created: file.created.toISOString(),
      })),
    });
  } catch (error) {
    console.error('バックアップファイルリスト取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'ファイルリストの取得に失敗しました',
    }, { status: 500 });
  }
}

