'use client';

import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Loader2 } from 'lucide-react';

interface StripePaymentFormProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (errorMessage: string) => void;
  onCancel: () => void;
}

export default function StripePaymentForm({ 
  amount, 
  onSuccess, 
  onError, 
  onCancel 
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // PaymentIntentを作成
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'jpy'
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'PaymentIntentの作成に失敗しました');
      }

      const { clientSecret } = data;

      // 支払いを確認
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (result.error) {
        onError(result.error.message || '支払い処理中にエラーが発生しました');
      } else {
        onSuccess(result.paymentIntent!.id);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : '支払い処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold text-gray-900">
              {amount.toLocaleString()}円
            </div>
            <p className="text-sm text-gray-600">
              クレジットカードでお支払いください
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          カード情報
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              処理中...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              支払いを完了する
            </>
          )}
        </Button>
        
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="w-full"
          disabled={isProcessing}
        >
          キャンセル
        </Button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        ※ Stripeで安全に支払いを行います
      </div>
    </form>
  );
}
