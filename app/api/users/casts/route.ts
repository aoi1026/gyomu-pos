import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Users casts endpoint not implemented' },
    { status: 501 }
  );
}
 