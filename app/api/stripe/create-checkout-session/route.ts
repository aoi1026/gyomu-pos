import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Stripe checkout session creation not implemented' },
    { status: 501 }
  );
}
 