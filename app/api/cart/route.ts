import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Cart endpoint not implemented' },
    { status: 501 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Create cart not implemented' },
    { status: 501 }
  );
}
 