import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'jpy' } = await request.json();

    if (!amount || amount < 50) {
      return NextResponse.json(
        { success: false, error: '最小支払い金額は50円です' },
        { status: 400 }
      );
    }

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