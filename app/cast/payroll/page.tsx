'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, DollarSign, Clock, TrendingUp, 
  Calendar, Download, Eye, Star, Wine
} from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';

// このページでは通貨表示を小数点以下2桁で統一
const formatCurrency2 = (amount: number): string => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeAmount);
};

export default function CastPayrollPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [salary, setSalary] = useState<any | null>(null);
  
  const router = useRouter();
  const { info } = useNotificationContext();

  useEffect(() => {
    // まずは新しいキャスト認証（localStorage）を確認
    const castAuth = typeof window !== 'undefined' ? localStorage.getItem('cast_auth') : null;
    if (castAuth) {
      try {
        const parsed = JSON.parse(castAuth);
        setUser(parsed);
        setIsLoading(false);
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
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/cast/salary?user_id=${user.id}&year=${selectedYear}&month=${selectedMonth}`);
        const result = await res.json();
        if (result.success) setSalary(result.data);
        else setSalary(null);
      } catch (e) {
        setSalary(null);
      }
    };
    load();
  }, [user, selectedYear, selectedMonth]);

  const downloadPayslip = (payrollItemId: string) => {
    info('給与明細をPDFでダウンロードします', 'PDFファイルをダウンロードしています。', 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['cast', 'admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/cast/dashboard')}
                  className="self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ダッシュボード</span>
                  <span className="sm:hidden">戻る</span>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">給与確認</h1>
                  <p className="text-xs sm:text-sm text-gray-500">給与明細・支給履歴の確認</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm">
                  {user?.name}
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 期間選択 */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-end space-x-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">年</label>
                  <input type="number" className="border px-2 py-1 rounded w-24" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">月</label>
                  <select className="border px-2 py-1 rounded w-24" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}月</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {salary ? (
            <div className="space-y-8">
              {/* 今月の給与サマリー */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-blue-800">
                      <DollarSign className="w-5 h-5 mr-2" />
                      支給予定額
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900 mb-1">
                      {formatCurrency2(Number(salary.total_pay_yen || 0))}
                    </div>
                    <div className="text-sm text-blue-700">
                      前月比 +8.5%
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-green-800">
                      <Clock className="w-5 h-5 mr-2" />
                      労働時間
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900 mb-1">
                      {Number(Number(salary.basic_hours || 0).toFixed(2))}h
                    </div>
                    <div className="text-sm text-green-700">&nbsp;</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-purple-800">
                      <Star className="w-5 h-5 mr-2" />
                      指名実績
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-900 mb-1">
                      {(Number(salary.main_nomination_count || 0) + Number(salary.inside_nomination_count || 0))}件
                    </div>
                    <div className="text-sm text-purple-700">本指名 {formatCurrency2(Number(salary.main_nomination_fee || 0))}</div>
                    <div className="text-sm text-purple-700">場内指名 {formatCurrency2(Number(salary.inside_nomination_fee || 0))}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-orange-800">
                      <Wine className="w-5 h-5 mr-2" />
                      バック実績
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-900 mb-1">
                      {formatCurrency2(Number(salary.drink_back_yen || 0) + Number(salary.food_back_yen || 0))}
                    </div>
                    <div className="text-sm text-orange-700">
                      総バック額
                    </div>
                    {/* 現在のバック率の表示はDB salary表示に統一のため省略 */}
                  </CardContent>
                </Card>
              </div>

              {/* 詳細給与明細 */}
              <Card>
                <CardHeader>
                   <CardTitle>今月の給与明細</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 支給項目 */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-green-800 border-b border-green-200 pb-2">支給項目</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>基本給</span>
                            <span className="font-medium">{formatCurrency2(Number(salary.base_pay || 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>指名料 ({Number(salary.main_nomination_count || 0) + Number(salary.inside_nomination_count || 0)}件)</span>
                            <span className="font-medium">{formatCurrency2(Number(salary.main_nomination_fee || 0) + Number(salary.inside_nomination_fee || 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>同伴料</span>
                            <span className="font-medium">{formatCurrency2(Number(salary.together_nomination_fee || 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ドリンクバック</span>
                            <span className="font-medium">{formatCurrency2(Number(salary.drink_back_yen || 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>フードバック</span>
                            <span className="font-medium">{formatCurrency2(Number(salary.food_back_yen || 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>残業代</span>
                            <span className="font-medium">{formatCurrency2(Number(salary.overtime_wage_yen || 0))}</span>
                          </div>
                        </div>
                      </div>

                      {/* 控除項目 */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-red-800 border-b border-red-200 pb-2">控除項目</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>各種控除</span>
                            <span className="font-medium text-red-600">
                              {Number(salary.deduction_yen || 0) > 0 ? `-${formatCurrency2(Number(salary.deduction_yen || 0))}` : '¥0.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>支給予定額</span>
                        <span className="text-purple-600">{formatCurrency2(Number(salary.total_pay_yen || 0))}</span>
                      </div>
                    </div>

                    {/* <div className="flex justify-center">
                      <Button 
                        onClick={() => {}}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        給与明細をダウンロード
                      </Button>
                    </div> */}
                  </div>
                </CardContent>
              </Card>

              {/* 給与履歴（省略/今は未使用） */}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-none flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">給与データがありません</h3>
              <p className="text-gray-500">給与計算が完了するまでお待ちください</p>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}