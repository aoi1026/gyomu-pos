'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown,
  Users, ShoppingCart, DollarSign, Calendar,
  Download, RefreshCw, Filter, FileSpreadsheet, FileText
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate, formatNumber } from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';
import { SalesChart } from '@/components/admin/SalesChart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function DailySalesPageContent() {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<string>(() => searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState<any>(null);
  const [tableSales, setTableSales] = useState<any[]>([]);
  const [castSales, setCastSales] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [deducts, setDeducts] = useState<any[]>([]);
  const [additionalStats, setAdditionalStats] = useState<any>({
    card_payments: 0,
    cash_payments: 0,
    cast_count: 0,
    male_attendance_count: 0,
    female_attendance_count: 0,
    monthly_gross_profit: 0
  });
  const [isDeductLoading, setIsDeductLoading] = useState(false);
  const [isAddDeductOpen, setIsAddDeductOpen] = useState(false);
  const [deductForm, setDeductForm] = useState<{ date: string; value: string; reason: string; other: string }>({
    date: new Date().toISOString().split('T')[0],
    value: '',
    reason: '',
    other: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { info, error } = useNotificationContext();

  useEffect(() => {
    loadSalesData(selectedDate);
    loadDeducts(selectedDate);
  }, [selectedDate]);

  const loadDeducts = async (date: string) => {
    setIsDeductLoading(true);
    try {
      const res = await fetch(`/api/deduct?date=${date}`, { cache: 'no-store' });
      const result = await res.json();
      if (result.success) {
        setDeducts(result.data || []);
      } else {
        setDeducts([]);
      }
    } catch {
      setDeducts([]);
    } finally {
      setIsDeductLoading(false);
    }
  };

  const openAddDeduct = () => {
    setDeductForm({
      date: selectedDate || new Date().toISOString().split('T')[0],
      value: '',
      reason: '',
      other: '',
    });
    setIsAddDeductOpen(true);
  };

  const saveDeduct = async () => {
    const valueNum = Number(String(deductForm.value || '').replace(',', '.'));
    if (!deductForm.date) {
      error('エラー', '日付を選択してください');
      return;
    }
    if (!Number.isFinite(valueNum) || valueNum < 0) {
      error('エラー', '経費金額は0以上の数値を入力してください');
      return;
    }
    try {
      const res = await fetch('/api/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: deductForm.date,
          value: valueNum,
          reason: deductForm.reason,
          other: deductForm.other,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        error('エラー', result.error || '経費の保存に失敗しました');
        return;
      }
      setIsAddDeductOpen(false);
      await loadDeducts(selectedDate);
      info('保存完了', '経費を追加しました', 2000);
    } catch (e) {
      error('エラー', `経費の保存に失敗しました: ${e instanceof Error ? e.message : '不明なエラー'}`);
    }
  };

  const shiftDay = (offset: number) => {
    if (!selectedDate) return;
    const base = new Date(selectedDate);
    if (Number.isNaN(base.getTime())) return;
    base.setDate(base.getDate() + offset);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleBackToMonthly = () => {
    router.push('/admin/sales/monthly');
  };

  const loadSalesData = async (date: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/sales/daily?date=${date}`);
      const result = await res.json();
      if (result.success) {
				const { 
          total_sales, order_count, visitor_count, avg_cost, sessions_total_cost, 
          total_payments, card_payments, cash_payments, cast_count,
          male_attendance_count, female_attendance_count, monthly_gross_profit,
          table_sales, cast_sales, product_sales, hourly_sales 
        } = result.data;
        setSalesData({
          subtotal_yen: 0,
          service_charge_yen: 0,
          tax_yen: 0,
          discount_yen: 0,
          total_yen: total_sales,
          order_count: order_count,
          customer_count: visitor_count,
          avg_cost: avg_cost,
          sessions_total_cost: sessions_total_cost,
          total_payments: total_payments || 0
        });
        setAdditionalStats({
          card_payments: card_payments || 0,
          cash_payments: cash_payments || 0,
          cast_count: cast_count || 0,
          male_attendance_count: male_attendance_count || 0,
          female_attendance_count: female_attendance_count || 0,
          monthly_gross_profit: monthly_gross_profit || 0
        });
        setTableSales(table_sales || []);
        setCastSales(cast_sales || []);
				setProductSales(product_sales || []);
        setHourlySales(hourly_sales || []);
      } else {
        setSalesData({
          subtotal_yen: 0,
          service_charge_yen: 0,
          tax_yen: 0,
          discount_yen: 0,
          total_yen: 0,
          order_count: 0,
          customer_count: 0,
          avg_cost: 0,
          sessions_total_cost: 0
        });
        setTableSales([]);
        setCastSales([]);
				setProductSales([]);
        setHourlySales([]);
      }
    } catch (e) {
      setSalesData({
        subtotal_yen: 0,
        service_charge_yen: 0,
        tax_yen: 0,
        discount_yen: 0,
        total_yen: 0,
        order_count: 0,
        customer_count: 0,
        avg_cost: 0,
        sessions_total_cost: 0
      });
      setTableSales([]);
      setCastSales([]);
			setProductSales([]);
      setHourlySales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      if (!salesData) {
        error('エラー', 'データが読み込まれていません');
        return;
      }

      const lines: string[] = [];
      
      // ヘッダー
      lines.push('日次売上レポート');
      lines.push(`対象日: ${selectedDate}`);
      lines.push('');
      
      // KPI情報
      const totalCost = Number(salesData?.sessions_total_cost || 0);
      const customerCount = Number(salesData?.customer_count || 0);
      const avgValue = customerCount > 0 ? totalCost / customerCount : 0;
      
      lines.push('【売上サマリー】');
      lines.push('項目,値');
      lines.push(`合計（セッション）,${Number(salesData.sessions_total_cost || 0).toFixed(2)}`);
      lines.push(`総売上,${Number(salesData.total_yen || 0).toFixed(2)}`);
      lines.push(`来客数,${salesData.customer_count || 0}`);
      lines.push(`注文件数,${salesData.order_count || 0}`);
      lines.push(`平均客単価,${avgValue.toFixed(2)}`);
      lines.push('');
      
      // 製品別売上
      lines.push('【製品別売上】');
      lines.push('製品名,数量,売上');
      productSales.forEach((row: any) => {
        const quantity = Math.round(Number(row.quantity) || 0);
        const sales = Number(row.total_sales) || 0;
        lines.push(`"${row.product_name || ''}",${quantity},${sales.toFixed(2)}`);
      });
      lines.push('');
      
      // キャスト別売上
      lines.push('【キャスト別売上】');
      lines.push('キャスト名,売上');
      castSales.forEach((cast: any) => {
        const sales = Number(cast.total_sales) || 0;
        lines.push(`"${cast.cast_name || ''}",${sales.toFixed(2)}`);
      });
      lines.push('');
      
      // テーブル別売上
      lines.push('【テーブル別売上】');
      lines.push('テーブル名,売上');
      tableSales.forEach((row: any) => {
        const sales = Number(row.total_sales) || 0;
        lines.push(`"${row.table_name || ''}",${sales.toFixed(2)}`);
      });
      lines.push('');
      
      // 時間別売上
      lines.push('【時間別売上】');
      lines.push('時間,売上,注文件数');
      hourlySales.forEach((row: any) => {
        const sales = Number(row.total_sales) || 0;
        const count = Number(row.order_count) || 0;
        lines.push(`${row.hour || 0}時,${sales.toFixed(2)},${count}`);
      });
      lines.push('');
      
      // 分析インサイト
      const hourlySalesValues = hourlySales.map((h: any) => Number(h.total_sales) || 0);
      const maxHourlySales = hourlySalesValues.length > 0 ? Math.max(...hourlySalesValues) : 0;
      const minHourlySales = hourlySalesValues.length > 0 ? Math.min(...hourlySalesValues.filter((v: number) => v > 0)) : 0;
      const maxHourlyIndex = hourlySalesValues.indexOf(maxHourlySales);
      const minHourlyIndex = hourlySalesValues.indexOf(minHourlySales);
      
      lines.push('【分析インサイト】');
      lines.push('項目,値');
      lines.push(`最高売上時間,${hourlySales[maxHourlyIndex]?.hour || 0}時 (${maxHourlySales.toFixed(2)})`);
      lines.push(`最低売上時間,${hourlySales[minHourlyIndex]?.hour || 0}時 (${minHourlySales.toFixed(2)})`);
      
      const content = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `日次売上_${selectedDate.replace(/-/g, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      info('CSV出力完了', '日次売上データをCSVでダウンロードしました', 3000);
    } catch (e) {
      console.error('CSV出力エラー:', e);
      error('CSV出力エラー', 'CSVの生成に失敗しました');
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCost = Number(salesData?.sessions_total_cost || 0);
  const customerCount = Number(salesData?.customer_count || 0);
  const avgOrderValue = customerCount > 0 ? totalCost / customerCount : 0;
  const avgOrderValueDisplay = `¥${new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avgOrderValue)}`;
  const totalDeduct = deducts.reduce((sum: number, d: any) => sum + (Number(d?.value) || 0), 0);

  return (
    <RoleGate allowedRoles={['admin', 'super_admin', 'superadmin']}>
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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">日次売上分析</h1>
                  <p className="text-xs sm:text-sm text-gray-500">日別の売上実績と分析</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSalesData(selectedDate)}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">更新</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">ダウンロード</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToCSV}>
                      <FileText className="w-4 h-4 mr-2" />
                      CSV形式でダウンロード
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 日付選択 */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <Label htmlFor="date">対象日</Label>
                </div>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shiftDay(-1)}
                  >
                    前日
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  >
                    本日
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shiftDay(1)}
                  >
                    翌日
                  </Button>
                </div>
                {searchParams.get('from') === 'monthly' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToMonthly}
                    className="ml-auto flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>月次売上に戻る</span>
                  </Button>
                )}
                {/* <div className="text-sm text-gray-500">
                  {formatDate ? formatDate(selectedDate) : selectedDate}
                </div> */}
              </div>
            </CardContent>
          </Card>

          {/* KPI カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-blue-800">
                  <DollarSign className="w-5 h-5 mr-2" />
                  合計
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {formatCurrency(salesData.sessions_total_cost || 0)}
                </div>
                <div className="text-sm text-blue-700 mb-1">
                総売上: {formatCurrency(salesData.total_yen)}
                </div>
                {/* <div className="flex items-center text-sm text-blue-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前日比 +12.5%
                </div> */}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-green-800">
                  <Users className="w-5 h-5 mr-2" />
                  来客数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 mb-1">
                  {formatNumber(salesData.customer_count)}組
                </div>
                {/* <div className="flex items-center text-sm text-green-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前日比 +8.3%
                </div> */}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-purple-800">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  注文件数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 mb-1">
                  {formatNumber(salesData.order_count)}件
                </div>
                {/* <div className="flex items-center text-sm text-purple-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前日比 +15.2%
                </div> */}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-orange-800">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  平均客単価
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900 mb-1">
                  {avgOrderValueDisplay}
                </div>
                {/* <div className="flex items-center text-sm text-orange-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前日比 +3.8%
                </div> */}
              </CardContent>
            </Card>
          </div>

          {/* 左側統計情報と右側タブ表示 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            {/* 左側: 統計情報リスト（1/4幅） */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">統計情報</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">総額</div>
                      <div className="text-lg font-bold">{formatCurrency(salesData?.sessions_total_cost || 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">製品売上高</div>
                      <div className="text-lg font-bold">{formatCurrency(salesData?.total_yen || 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">カード売上</div>
                      <div className="text-lg font-bold">{formatCurrency(additionalStats.card_payments || 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">現金売上</div>
                      <div className="text-lg font-bold">{formatCurrency(additionalStats.cash_payments || 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">キャスト人数</div>
                      <div className="text-lg font-bold">{formatNumber(additionalStats.cast_count || 0)}名</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">勤務人員数(男性)</div>
                      <div className="text-lg font-bold">{formatNumber(additionalStats.male_attendance_count || 0)}名</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">勤務人員数(女性)</div>
                      <div className="text-lg font-bold">{formatNumber(additionalStats.female_attendance_count || 0)}名</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">出金合計</div>
                      <div className="text-lg font-bold">{formatCurrency(totalDeduct)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右側: タブ表示（3/4幅） */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="deducts" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="deducts">経費金額一覧</TabsTrigger>
                  <TabsTrigger value="products">製品別売上</TabsTrigger>
                  <TabsTrigger value="casts">キャスト別売上</TabsTrigger>
                  <TabsTrigger value="tables">テーブル別売上</TabsTrigger>
                  <TabsTrigger value="hourly">時間別売上</TabsTrigger>
                </TabsList>

                <TabsContent value="deducts" className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>経費金額一覧</CardTitle>
                        <Button size="sm" onClick={openAddDeduct}>
                          経費追加
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isDeductLoading ? (
                        <div className="text-sm text-gray-500">読み込み中...</div>
                      ) : deducts.length === 0 ? (
                        <div className="text-sm text-gray-500">この日の経費はありません</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-32">日付</TableHead>
                                <TableHead className="text-right w-32">金額</TableHead>
                                <TableHead>理由</TableHead>
                                <TableHead>備考</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {deducts.map((d: any) => (
                                <TableRow key={d.id}>
                                  <TableCell>{String(d.date ?? '')}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(Number(d.value) || 0)}</TableCell>
                                  <TableCell className="whitespace-pre-wrap">{d.reason || '-'}</TableCell>
                                  <TableCell className="whitespace-pre-wrap">{d.other || '-'}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-semibold">合計</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totalDeduct)}</TableCell>
                                <TableCell />
                                <TableCell />
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>製品別売上</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {productSales.length === 0 ? (
                          <div className="text-sm text-gray-500">データがありません</div>
                        ) : (
                          productSales.map((row: any) => (
                            <div key={row.product_id} className="flex justify-between items-center">
                              <span className="text-gray-700">{row.product_name}</span>
                              <span className="font-medium">{formatCurrency(row.total_sales)} ({formatNumber(Math.round(Number(row.quantity) || 0))}件)</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="casts" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>キャスト別売上</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {castSales.length === 0 ? (
                          <div className="text-sm text-gray-500">データがありません</div>
                        ) : (
                          castSales.map((cast: any) => (
                            <div key={cast.cast_id} className="flex justify-between items-center">
                              <span className="text-gray-700">{cast.cast_name}</span>
                              <span className="font-medium">{formatCurrency(cast.total_sales)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tables" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>テーブル別売上</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {tableSales.length === 0 ? (
                          <div className="text-sm text-gray-500">データがありません</div>
                        ) : (
                          tableSales.map((row: any) => (
                            <div key={row.table_id} className="flex justify-between items-center">
                              <div className="flex items-center space-x-3">
                                <span className="text-gray-700">{row.table_name}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/admin/sales/daily/table/${row.table_id}?date=${encodeURIComponent(selectedDate)}`)}
                                >
                                  詳細表示
                                </Button>
                              </div>
                              <span className="font-medium">{formatCurrency(row.total_sales)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="hourly" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>売上分析 - 時間別要素</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {hourlySales.length === 0 ? (
                        <div className="text-sm text-gray-500">データがありません</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {hourlySales.map((row: any) => {
                              const sales = Number(row.total_sales) || 0;
                              const count = Number(row.order_count) || 0;
                              return (
                                <div key={row.hour} className="bg-gray-50 rounded-lg p-3">
                                  <div className="text-sm font-medium text-gray-700">{row.hour || 0}時</div>
                                  <div className="text-lg font-bold text-purple-600 mt-1">{formatCurrency(sales)}</div>
                                  <div className="text-xs text-gray-500 mt-1">{count}件</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* 最下部: 当日現金、月間残高総額、粗利益 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">当日現金</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(salesData?.total_payments || 0)}
                </div>
                <div className="text-sm text-blue-700 mt-1">管理者ダッシュボードの本日売上</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">月間残高総額</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(additionalStats.monthly_gross_profit || 0)}
                </div>
                <div className="text-sm text-green-700 mt-1">該当月の1日から現在までの粗利益の合計</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-800">粗利益</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency((salesData?.total_payments || 0) - totalDeduct)}
                </div>
                <div className="text-sm text-purple-700 mt-1">当日現金から出金合計を差し引いた額</div>
              </CardContent>
            </Card>
          </div>

          {/* 時間別売上分析 */}
          {/* <Card className="mb-8">
            <CardHeader>
              <CardTitle>時間別売上分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hourlySales.length === 0 ? (
                  <div className="text-sm text-gray-500">データがありません</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {hourlySales.map((row: any) => {
                        const sales = Number(row.total_sales) || 0;
                        const count = Number(row.order_count) || 0;
                        return (
                          <div key={row.hour} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-700">{row.hour || 0}時</div>
                            <div className="text-lg font-bold text-purple-600 mt-1">{formatCurrency(sales)}</div>
                            <div className="text-xs text-gray-500 mt-1">{count}件</div>
                          </div>
                        );
                      })}
                    </div>
                    
                    // 分析インサイト 
                    {(() => {
                      const hourlySalesValues = hourlySales.map((h: any) => Number(h.total_sales) || 0);
                      const maxHourlySales = hourlySalesValues.length > 0 ? Math.max(...hourlySalesValues) : 0;
                      const minHourlySales = hourlySalesValues.length > 0 ? Math.min(...hourlySalesValues.filter((v: number) => v > 0)) : 0;
                      const maxHourlyIndex = hourlySalesValues.indexOf(maxHourlySales);
                      const minHourlyIndex = hourlySalesValues.indexOf(minHourlySales);
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="text-xs text-green-700 mb-1">最高売上時間</div>
                            <div className="text-lg font-bold text-green-900">{hourlySales[maxHourlyIndex]?.hour || 0}時</div>
                            <div className="text-sm text-green-700 mt-1">{formatCurrency(maxHourlySales)}</div>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="text-xs text-red-700 mb-1">最低売上時間</div>
                            <div className="text-lg font-bold text-red-900">{hourlySales[minHourlyIndex]?.hour || 0}時</div>
                            <div className="text-sm text-red-700 mt-1">{formatCurrency(minHourlySales)}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </CardContent>
          </Card> */}


          <Dialog open={isAddDeductOpen} onOpenChange={setIsAddDeductOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>経費追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deduct-date">日付</Label>
                  <Input
                    id="deduct-date"
                    type="date"
                    value={deductForm.date}
                    onChange={(e) => setDeductForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deduct-value">経費金額</Label>
                  <Input
                    id="deduct-value"
                    inputMode="decimal"
                    value={deductForm.value}
                    onChange={(e) => setDeductForm((p) => ({ ...p, value: e.target.value }))}
                    placeholder="例: 10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deduct-reason">理由</Label>
                  <Input
                    id="deduct-reason"
                    value={deductForm.reason}
                    onChange={(e) => setDeductForm((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="例: 備品購入"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deduct-other">備考</Label>
                  <Textarea
                    id="deduct-other"
                    value={deductForm.other}
                    onChange={(e) => setDeductForm((p) => ({ ...p, other: e.target.value }))}
                    placeholder="任意"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsAddDeductOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={saveDeduct}>
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Sales Chart */}
          <div className="mt-8">
            <SalesChart period="daily" selectedDate={selectedDate} />
          </div>
        </div>
      </div>
    </RoleGate>
  );
}

export default function DailySalesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DailySalesPageContent />
    </Suspense>
  );
}