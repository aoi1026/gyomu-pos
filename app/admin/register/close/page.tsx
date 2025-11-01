'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Calculator, DollarSign, AlertTriangle, 
  CheckCircle, Lock, Calendar
} from 'lucide-react';
import { 
  mockDailySales, mockRegisterCloses, formatCurrency, formatDate
} from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';

export default function RegisterClosePage() {
  const [selectedDate, setSelectedDate] = useState<string>('2025-01-20');
  const [salesData, setSalesData] = useState<any>(null);
  const [cashCounts, setCashCounts] = useState({
    bills_10000: 0,
    bills_5000: 0,
    bills_1000: 0,
    coins_500: 0,
    coins_100: 0,
    coins_50: 0,
    coins_10: 0,
    coins_5: 0,
    coins_1: 0
  });
  const [note, setNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const router = useRouter();
  const { error } = useNotificationContext();

  useEffect(() => {
    loadSalesData(selectedDate);
    
    // 既にレジ締めが完了しているかチェック
    const existingClose = mockRegisterCloses.find(c => c.business_date === selectedDate);
    setIsCompleted(!!existingClose);
  }, [selectedDate]);

  const loadSalesData = async (date: string) => {
    const data = mockDailySales[date as keyof typeof mockDailySales];
    setSalesData(data || {
      subtotal_yen: 0,
      service_charge_yen: 0,
      tax_yen: 0,
      discount_yen: 0,
      total_yen: 0,
      order_count: 0,
      customer_count: 0
    });
  };

  const calculateCashTotal = () => {
    return (
      cashCounts.bills_10000 * 10000 +
      cashCounts.bills_5000 * 5000 +
      cashCounts.bills_1000 * 1000 +
      cashCounts.coins_500 * 500 +
      cashCounts.coins_100 * 100 +
      cashCounts.coins_50 * 50 +
      cashCounts.coins_10 * 10 +
      cashCounts.coins_5 * 5 +
      cashCounts.coins_1 * 1
    );
  };

  const updateCashCount = (denomination: string, value: number) => {
    setCashCounts(prev => ({
      ...prev,
      [denomination]: Math.max(0, value)
    }));
  };

  const cashTotal = calculateCashTotal();
  const expectedCash = Math.round(salesData?.total_yen * 0.6 || 0); // 現金比率60%と仮定
  const difference = cashTotal - expectedCash;

  const closeRegister = async () => {
    setIsProcessing(true);
    
    try {
      // レジ締め処理のモック
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const closeData = {
        business_date: selectedDate,
        cash_expected_yen: expectedCash,
        cash_actual_yen: cashTotal,
        difference_yen: difference,
        note: note,
        closed_at: new Date().toISOString()
      };
      
      console.log('レジ締め完了:', closeData);
      setIsCompleted(true);
      
    } catch (err) {
      error('レジ締め処理に失敗しました', 'システムエラーが発生しました。再度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  const denominationLabels = {
    bills_10000: '一万円札',
    bills_5000: '五千円札',
    bills_1000: '千円札',
    coins_500: '五百円玉',
    coins_100: '百円玉',
    coins_50: '五十円玉',
    coins_10: '十円玉',
    coins_5: '五円玉',
    coins_1: '一円玉'
  };

  if (isCompleted) {
    return (
      <RoleGate allowedRoles={['admin', 'superadmin']}>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="text-center p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">レジ締め完了</h2>
              <p className="text-gray-600 mb-6">
                {formatDate(selectedDate)}のレジ締めが完了しました
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>期待現金額</span>
                    <span>{formatCurrency(expectedCash)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>実際現金額</span>
                    <span>{formatCurrency(cashTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>差異</span>
                    <span className={difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}>
                      {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                    </span>
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => router.push('/dashboard')}
                >
                  ダッシュボードに戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    );
  }

  return (
    <RoleGate allowedRoles={['admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ダッシュボード</span>
                  <span className="sm:hidden">戻る</span>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">レジ締め</h1>
                  <p className="text-xs sm:text-sm text-gray-500">日次現金管理と売上確定</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <Lock className="w-3 h-3 mr-1" />
                  重要操作
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 日付選択 */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <Label htmlFor="date">対象営業日</Label>
                </div>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 売上サマリー */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  売上サマリー
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span>小計</span>
                    <span className="font-medium">{formatCurrency(salesData?.subtotal_yen || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>サービス料</span>
                    <span className="font-medium">{formatCurrency(salesData?.service_charge_yen || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>消費税</span>
                    <span className="font-medium">{formatCurrency(salesData?.tax_yen || 0)}</span>
                  </div>
                  {(salesData?.discount_yen || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>割引</span>
                      <span className="font-medium">-{formatCurrency(salesData.discount_yen)}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-3 flex justify-between font-bold text-lg">
                    <span>総売上</span>
                    <span className="text-blue-600">{formatCurrency(salesData?.total_yen || 0)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="font-bold text-lg">{salesData?.order_count || 0}</div>
                    <div className="text-gray-600">注文件数</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="font-bold text-lg">{salesData?.customer_count || 0}</div>
                    <div className="text-gray-600">来客数</div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Calculator className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-800">期待現金額（推定）</span>
                  </div>
                  <div className="text-xl font-bold text-yellow-900">
                    {formatCurrency(expectedCash)}
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    ※ 現金比率60%で算出
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 現金実棚 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  現金実棚
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(denominationLabels).map(([key, label]) => (
                    <div key={key}>
                      <Label htmlFor={key} className="text-sm">{label}</Label>
                      <Input
                        id={key}
                        type="number"
                        min="0"
                        value={cashCounts[key as keyof typeof cashCounts]}
                        onChange={(e) => updateCashCount(key, Number(e.target.value))}
                        className="text-right"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">実際現金額</span>
                    <span className="text-xl font-bold text-purple-600">
                      {formatCurrency(cashTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">差異</span>
                    <span className={`text-lg font-bold ${
                      difference === 0 ? 'text-green-600' : 
                      difference > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                    </span>
                  </div>
                </div>

                {difference !== 0 && (
                  <div className={`border rounded-lg p-4 ${
                    Math.abs(difference) > 1000 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center mb-2">
                      <AlertTriangle className={`w-4 h-4 mr-2 ${
                        Math.abs(difference) > 1000 ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <span className={`font-medium ${
                        Math.abs(difference) > 1000 ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {Math.abs(difference) > 1000 ? '大きな差異があります' : '差異があります'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      Math.abs(difference) > 1000 ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      差異の理由を備考欄に記入してください
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="note">備考・差異理由</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="差異がある場合は理由を記入してください..."
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                  onClick={closeRegister}
                  disabled={isProcessing || (Math.abs(difference) > 1000 && !note.trim())}
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      処理中...
                    </div>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      レジ締め実行
                    </>
                  )}
                </Button>

                {Math.abs(difference) > 1000 && !note.trim() && (
                  <p className="text-sm text-red-600 text-center">
                    大きな差異がある場合は備考の入力が必要です
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}