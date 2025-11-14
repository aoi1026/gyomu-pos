'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown,
  Users, ShoppingCart, DollarSign, Calendar,
  Download, RefreshCw, Filter
} from 'lucide-react';
import {
  formatCurrency, formatDate,
  formatNumber
} from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';
import { SalesChart } from '@/components/admin/SalesChart';

export default function DailySalesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState<any>(null);
  const [tableSales, setTableSales] = useState<any[]>([]);
  const [castSales, setCastSales] = useState<any[]>([]);
	const [productSales, setProductSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { info } = useNotificationContext();

  useEffect(() => {
    loadSalesData(selectedDate);
  }, [selectedDate]);

  const loadSalesData = async (date: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/sales/daily?date=${date}`);
      const result = await res.json();
      if (result.success) {
				const { total_sales, order_count, visitor_count, avg_cost, sessions_total_cost, table_sales, cast_sales, product_sales } = result.data;
        setSalesData({
          subtotal_yen: 0,
          service_charge_yen: 0,
          tax_yen: 0,
          discount_yen: 0,
          total_yen: total_sales,
          order_count: order_count,
          customer_count: visitor_count,
          avg_cost: avg_cost,
          sessions_total_cost: sessions_total_cost
        });
        setTableSales(table_sales || []);
        setCastSales(cast_sales || []);
				setProductSales(product_sales || []);
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
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    // CSV出力の処理（モック）
    info('売上データをCSVで出力します', 'データをダウンロードしています。', 3000);
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
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">CSV出力</span>
                </Button> */}
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
                  className="w-48"
                />
                <Button
                  variant="outline"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                >
                  今日
                </Button>
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
                <div className="flex items-center text-sm text-green-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前日比 +8.3%
                </div>
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
                <div className="flex items-center text-sm text-purple-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前日比 +15.2%
                </div>
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
                <div className="flex items-center text-sm text-orange-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前日比 +3.8%
                </div>
              </CardContent>
            </Card>
          </div>

		  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
			  {/* 製品別売上 */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>製品別売上</CardTitle>
              </CardHeader>
			  <CardContent className="flex-1 overflow-hidden">
				  <div className="space-y-3 max-h-96 overflow-y-auto">
					  {productSales.map((row: any) => (
						  <div key={row.product_id} className="flex justify-between items-center">
							  <span className="text-gray-700">{row.product_name}</span>
							  <span className="font-medium">{formatNumber(Math.round(Number(row.quantity) || 0))}件</span>
						  </div>
					  ))}
				  </div>
			  </CardContent>
            </Card>

            {/* キャスト別売上 */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>キャスト別売上</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {castSales.map((cast: any) => (
                    <div key={cast.cast_id} className="flex justify-between items-center">
                      <span className="text-gray-700">{cast.cast_name}</span>
                      <span className="font-medium">{formatCurrency(cast.total_sales)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* テーブル別売上 */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>テーブル別売上</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tableSales.map((row: any) => (
                    <div key={row.table_id} className="flex justify-between items-center">
                      <span className="text-gray-700">{row.table_name}</span>
                      <span className="font-medium">{formatCurrency(row.total_sales)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

		  {/* Sales Chart */}
          <div className="mt-8">
			  <SalesChart period="daily" selectedDate={selectedDate} />
          </div>
        </div>
      </div>
    </RoleGate>
  );
}