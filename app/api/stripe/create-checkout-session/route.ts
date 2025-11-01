import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Stripe checkout session creation not implemented' },
    { status: 501 }
  );
}
 