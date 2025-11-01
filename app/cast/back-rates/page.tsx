'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, DollarSign, TrendingUp, Calendar, 
  Users, Wine, Star, Clock
} from 'lucide-react';
// DBの最新値を直接取得して表示する
import { getCurrentUser } from '@/lib/auth';
import { useNotificationContext } from '@/lib/notification-context';

export default function CastBackRatesPage() {
  const [currentRate, setCurrentRate] = useState<any | null>(null);
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const { error } = useNotificationContext();

  useEffect(() => {
    // まずは新しいキャスト認証を確認
    const castAuth = typeof window !== 'undefined' ? localStorage.getItem('cast_auth') : null;
    if (castAuth) {
      try {
        const parsed = JSON.parse(castAuth);
        setUser(parsed);
        loadBackRates(parsed.id);
        return;
      } catch (e) {
        console.error('cast_auth parse error', e);
        localStorage.removeItem('cast_auth');
      }
    }

    // 従来の認証にもフォールバック
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    loadBackRates(currentUser.id);
  }, [router]);

  const loadBackRates = async (castId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cast-back-rates');
      const result = await res.json();
      if (result.success) {
        const me = (result.casts as any[]).find(c => String(c.id) === String(castId));
        setCurrentRate(me || null);
        setRateHistory([]);
      } else {
        setCurrentRate(null);
        setRateHistory([]);
      }
    } catch (err) {
      error('エラー', 'バック率の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['cast']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/cast/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ダッシュボード
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">バック率確認</h1>
                  <p className="text-sm text-gray-500">あなたの現在のバック率と履歴</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 現在のバック率 */}
          {currentRate ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  現在のバック率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-4 bg-blue-50">
                    <div className="text-sm text-blue-700">ドリンクバック</div>
                    <div className="text-2xl font-bold text-blue-900">{Number(currentRate.drink_back || 0).toFixed(2)}%</div>
                  </div>
                  <div className="p-4 bg-green-50">
                    <div className="text-sm text-green-700">ボトルバック</div>
                    <div className="text-2xl font-bold text-green-900">{Number(currentRate.bottle_back || 0).toFixed(2)}%</div>
                  </div>
                  <div className="p-4 bg-purple-50">
                    <div className="text-sm text-purple-700">本指名料率</div>
                    <div className="text-2xl font-bold text-purple-900">{Number(currentRate.main_nomination || 0).toFixed(2)}%</div>
                  </div>
                  <div className="p-4 bg-orange-50">
                    <div className="text-sm text-orange-700">場内指名料率</div>
                    <div className="text-2xl font-bold text-orange-900">{Number(currentRate.inside_nomination || 0).toFixed(2)}%</div>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <div className="text-sm text-gray-700">時間当たり価格</div>
                    <div className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(Number(currentRate.hourly_price || 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-none flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">バック率が設定されていません</h3>
                <p className="text-gray-500">管理者にお問い合わせください</p>
              </CardContent>
            </Card>
          )}

          {/* バック率履歴 */}
          {rateHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  バック率履歴
                </CardTitle>
                <CardDescription>
                  過去のバック率変更履歴
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rateHistory.map((rate, index) => (
                    <div 
                      key={rate.id}
                      className={`p-4 rounded-none border ${
                        index === 0 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-none flex items-center justify-center ${
                            index === 0 ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Clock className={`w-4 h-4 ${
                              index === 0 ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {rate.effective_from}
                              {index === 0 && (
                                <Badge variant="outline" className="ml-2 bg-green-100 text-green-700">
                                  現在適用中
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {rate.effective_to ? `〜 ${rate.effective_to}` : '現在まで'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-gray-600">ドリンク</div>
                          <div className="font-medium">{formatBackRate(rate.drink_back_rate)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600">ボトル</div>
                          <div className="font-medium">{formatBackRate(rate.bottle_back_rate)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600">本指名</div>
                          <div className="font-medium">{formatBackRate(rate.nomination_rate)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600">場内指名</div>
                          <div className="font-medium">{formatBackRate(rate.field_nomination_rate)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 説明セクション */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">バック率について</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">計算方法</h4>
                  <ul className="space-y-1">
                    <li>• ドリンクバック = 売上 × ドリンクバック率</li>
                    <li>• ボトルバック = 売上 × ボトルバック率</li>
                    <li>• 指名料 = 指名金額 × 指名料率</li>
                    <li>• 給与に自動反映されます</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">注意事項</h4>
                  <ul className="space-y-1">
                    <li>• バック率は管理者が設定します</li>
                    <li>• 変更は翌日から適用されます</li>
                    <li>• 履歴は過去の変更を確認できます</li>
                    <li>• 不明な点は管理者にお問い合わせください</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}
