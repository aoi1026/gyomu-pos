import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  return NextResponse.json(
    { success: false, error: 'Order accept not implemented', id },
    { status: 501 }
  );
}
 