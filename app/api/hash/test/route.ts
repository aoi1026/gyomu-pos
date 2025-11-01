import { NextRequest, NextResponse } from 'next/server';
import { md5Hash, hashPassword, verifyPassword } from '@/lib/hash';

export async function POST(request: NextRequest) {
  try {
    const { password, action = 'hash' } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'パスワードを入力してください。' },
        { status: 400 }
      );
    }

    let result;
    
    switch (action) {
      case 'hash':
        result = {
          original: password,
          hashed: hashPassword(password),
          md5: md5Hash(password)
        };
        break;
        
      case 'verify':
        const { hashedPassword } = await request.json();
        if (!hashedPassword) {
          return NextResponse.json(
            { error: 'ハッシュ化されたパスワードを入力してください。' },
            { status: 400 }
          );
        }
        result = {
          original: password,
          hashed: hashedPassword,
          verified: verifyPassword(password, hashedPassword)
        };
        break;
        
      default:
        return NextResponse.json(
          { error: '無効なアクションです。hash または verify を指定してください。' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('ハッシュテストエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
