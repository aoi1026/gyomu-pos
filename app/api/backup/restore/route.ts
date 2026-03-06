import { NextRequest, NextResponse } from 'next/server';
import { restoreBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// バックアップファイルからデータベースを復元
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({
        success: false,
        error: 'ファイル名が指定されていません',
      }, { status: 400 });
    }

    const result = await restoreBackup(filename);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'データベースの復元が完了しました',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'データベースの復元に失敗しました',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('リストアAPIエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'データベースの復元に失敗しました',
    }, { status: 500 });
  }
}

