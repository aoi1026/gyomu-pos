import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return NextResponse.json(
    { success: false, error: 'Cart item endpoint not implemented', id },
    { status: 501 }
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return NextResponse.json(
    { success: false, error: 'Delete cart item not implemented', id },
    { status: 501 }
  );
}
 