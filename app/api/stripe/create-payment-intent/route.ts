import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'jpy' } = await request.json();

    if (!amount || amount < 50) {
      return NextResponse.json(
        { success: false, error: '最小支払い金額は50円です' },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'Stripeの秘密鍵が設定されていません' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      metadata: {
        source: 'pos-system'
      }
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('PaymentIntent作成エラー:', error);
    return NextResponse.json(
      { success: false, error: 'PaymentIntentの作成に失敗しました' },
      { status: 500 }
    );
  }
}