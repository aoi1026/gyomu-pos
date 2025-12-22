'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, 
  Users, ShoppingCart, DollarSign, Calendar,
  Download, RefreshCw, Wine, Utensils, Package, FileSpreadsheet, FileText, ExternalLink
} from 'lucide-react';
import { 
  mockMonthlySales, mockMenuItems,
  formatCurrency, formatNumber, formatPercentage
} from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MonthlySalesPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [salesData, setSalesData] = useState<any>(null);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);
  const [castSales, setCastSales] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [dailyCheckRows, setDailyCheckRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const { info, error } = useNotificationContext();

  useEffect(() => {
    loadMonthlySalesData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const loadMonthlySalesData = async (year: number, month: number) => {
    setIsLoading(true);
    try {
      const [res, dailyCheckRes] = await Promise.all([
        fetch(`/api/admin/sales/monthly?year=${year}&month=${month}`),
        fetch(`/api/admin/sales/daily-check?year=${year}&month=${month}`, { cache: 'no-store' }),
      ]);
      const result = await res.json();
      const dailyCheckResult = await dailyCheckRes.json();

      if (result.success) {
        const { total_sales, order_count, visitor_count, avg_cost, sessions_total_cost, category_sales, product_sales, cast_sales, daily_sales } = result.data;
        setSalesData({
          total_yen: total_sales,
          order_count: order_count,
          customer_count: visitor_count,
          avg_customer_spend: avg_cost,
          sessions_total_cost: sessions_total_cost
        });
        setCategorySales(category_sales || []);
        setProductSales(product_sales || []);
        setCastSales(cast_sales || []);
        setDailySales((daily_sales || []).map((d: any) => ({
          date: new Date(d.day).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
          value: Number(d.total_sales) || 0
        })));

        if (dailyCheckResult?.success) {
          setDailyCheckRows(dailyCheckResult.data || []);
        } else {
          setDailyCheckRows([]);
        }
      } else {
        setSalesData({
          total_yen: 0,
          order_count: 0,
          customer_count: 0,
          avg_customer_spend: 0,
          sessions_total_cost: 0
        });
        setCategorySales([]);
        setProductSales([]);
        setCastSales([]);
        setDailySales([]);
        setDailyCheckRows([]);
      }
    } catch (e) {
      setSalesData({
        total_yen: 0,
        order_count: 0,
        customer_count: 0,
        avg_customer_spend: 0,
        sessions_total_cost: 0
      });
      setCategorySales([]);
      setProductSales([]);
      setCastSales([]);
      setDailySales([]);
      setDailyCheckRows([]);
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
      lines.push('月次売上レポート');
      lines.push(`対象期間: ${selectedYear}年${selectedMonth}月`);
      lines.push('');
      
      // KPI情報
      lines.push('【売上サマリー】');
      lines.push('項目,値');
      lines.push(`合計（セッション）,${Number(salesData.sessions_total_cost || 0).toFixed(2)}`);
      lines.push(`月間売上,${Number(salesData.total_yen || 0).toFixed(2)}`);
      lines.push(`来客数,${salesData.customer_count || 0}`);
      lines.push(`注文件数,${salesData.order_count || 0}`);
      lines.push(`平均客単価,${Number(salesData.avg_customer_spend || 0).toFixed(2)}`);
      lines.push('');
      
      // 日別売上
      lines.push('【日別売上】');
      lines.push('日付,売上');
      dailySales.forEach((d: any) => {
        lines.push(`"${d.date}",${Number(d.value).toFixed(2)}`);
      });
      lines.push('');
      
      // 日別売上分析インサイト
      const dailySalesValues = dailySales.map((d: any) => d.value);
      const maxDailySales = dailySalesValues.length > 0 ? Math.max(...dailySalesValues) : 0;
      const minDailySales = dailySalesValues.length > 0 ? Math.min(...dailySalesValues.filter((v: number) => v > 0)) : 0;
      const maxDailyIndex = dailySalesValues.indexOf(maxDailySales);
      const minDailyIndex = dailySalesValues.indexOf(minDailySales);
      
      lines.push('【日別売上分析インサイト】');
      lines.push('項目,値');
      lines.push(`最高売上日,"${dailySales[maxDailyIndex]?.date || '-'}"`);
      lines.push(`最高売上金額,${maxDailySales.toFixed(2)}`);
      lines.push(`最低売上日,"${dailySales[minDailyIndex]?.date || '-'}"`);
      lines.push(`最低売上金額,${minDailySales.toFixed(2)}`);
      lines.push('');
      
      // カテゴリ別売上
      lines.push('【カテゴリ別売上】');
      lines.push('カテゴリ名,数量,売上');
      categorySales.forEach((category: any) => {
        const quantity = Math.round(Number(category.quantity) || 0);
        const sales = Number(category.total_sales) || 0;
        lines.push(`"${category.category_name || ''}",${quantity},${sales.toFixed(2)}`);
      });
      lines.push('');
      
      // 製品別売上
      lines.push('【製品別売上】');
      lines.push('製品名,数量,売上');
      productSales.forEach((product: any) => {
        const quantity = Math.round(Number(product.quantity) || 0);
        const sales = Number(product.total_sales) || 0;
        lines.push(`"${product.product_name || ''}",${quantity},${sales.toFixed(2)}`);
      });
      lines.push('');
      
      // キャスト別売上
      lines.push('【キャスト別売上】');
      lines.push('キャスト名,売上');
      castSales.forEach((cast: any) => {
        const sales = Number(cast.total_sales) || 0;
        lines.push(`"${cast.cast_name || ''}",${sales.toFixed(2)}`);
      });
      
      const content = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `月次売上_${selectedYear}${String(selectedMonth).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      info('CSV出力完了', '月次売上データをCSVでダウンロードしました', 3000);
    } catch (e) {
      console.error('CSV出力エラー:', e);
      error('CSV出力エラー', 'CSVの生成に失敗しました');
    }
  };

  const exportToExcel = () => {
    try {
      if (!salesData) {
        error('エラー', 'データが読み込まれていません');
        return;
      }

      const workbook = XLSX.utils.book_new();
      
      // サマリーシート
      const summaryData = [
        ['月次売上レポート'],
        [`対象期間: ${selectedYear}年${selectedMonth}月`],
        [''],
        ['【売上サマリー】'],
        ['項目', '値'],
        ['合計（セッション）', Number(salesData.sessions_total_cost || 0).toFixed(2)],
        ['月間売上', Number(salesData.total_yen || 0).toFixed(2)],
        ['来客数', `${salesData.customer_count || 0}組`],
        ['注文件数', `${salesData.order_count || 0}件`],
        ['平均客単価', Number(salesData.avg_customer_spend || 0).toFixed(2)],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'サマリー');
      
      // 日別売上シート
      const dailyData = [
        ['日付', '売上']
      ];
      dailySales.forEach((d: any) => {
        dailyData.push([d.date, Number(d.value).toFixed(2)]);
      });
      
      // 日別売上分析インサイトを追加
      const dailySalesValues = dailySales.map((d: any) => d.value);
      const maxDailySales = dailySalesValues.length > 0 ? Math.max(...dailySalesValues) : 0;
      const minDailySales = dailySalesValues.length > 0 ? Math.min(...dailySalesValues.filter((v: number) => v > 0)) : 0;
      const maxDailyIndex = dailySalesValues.indexOf(maxDailySales);
      const minDailyIndex = dailySalesValues.indexOf(minDailySales);
      
      dailyData.push(['']); // 空行
      dailyData.push(['【日別売上分析インサイト】']);
      dailyData.push(['項目', '値']);
      dailyData.push(['最高売上日', dailySales[maxDailyIndex]?.date || '-']);
      dailyData.push(['最高売上金額', maxDailySales.toFixed(2)]);
      dailyData.push(['最低売上日', dailySales[minDailyIndex]?.date || '-']);
      dailyData.push(['最低売上金額', minDailySales.toFixed(2)]);
      
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(workbook, dailySheet, '日別売上');
      
      // カテゴリ別売上シート
      const categoryData = [
        ['カテゴリ名', '数量', '売上']
      ];
      categorySales.forEach((category: any) => {
        categoryData.push([
          category.category_name || '',
          Math.round(Number(category.quantity) || 0),
          Number(Number(category.total_sales) || 0).toFixed(2)
        ]);
      });
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'カテゴリ別売上');
      
      // 製品別売上シート
      const productData = [
        ['製品名', '数量', '売上']
      ];
      productSales.forEach((product: any) => {
        productData.push([
          product.product_name || '',
          Math.round(Number(product.quantity) || 0),
          Number(Number(product.total_sales) || 0).toFixed(2)
        ]);
      });
      const productSheet = XLSX.utils.aoa_to_sheet(productData);
      XLSX.utils.book_append_sheet(workbook, productSheet, '製品別売上');
      
      // キャスト別売上シート
      const castData = [
        ['キャスト名', '売上']
      ];
      castSales.forEach((cast: any) => {
        castData.push([
          cast.cast_name || '',
          Number(Number(cast.total_sales) || 0).toFixed(2)
        ]);
      });
      const castSheet = XLSX.utils.aoa_to_sheet(castData);
      XLSX.utils.book_append_sheet(workbook, castSheet, 'キャスト別売上');
      
      // ファイル出力
      XLSX.writeFile(workbook, `月次売上_${selectedYear}${String(selectedMonth).padStart(2, '0')}.xlsx`);
      
      info('Excel出力完了', '月次売上データをExcelでダウンロードしました', 3000);
    } catch (e) {
      console.error('Excel出力エラー:', e);
      error('Excel出力エラー', 'Excelの生成に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dailyMax = dailySales.length > 0 ? Math.max(...dailySales.map((d: any) => d.value)) : 1;
	const maxItem = dailySales.length > 0 ? dailySales.reduce((m: any, d: any) => (d.value > m.value ? d : m), dailySales[0]) : null;
	const minItem = dailySales.length > 0 ? dailySales.reduce((m: any, d: any) => (d.value < m.value ? d : m), dailySales[0]) : null;
	const chartHeight = 200;
	const topPad = 40;
	const bottomPad = 40;
	const leftPad = 50;
	const rightPad = 20;
	const baseSvgWidth = 480;
	const svgWidth = leftPad + rightPad + (baseSvgWidth - leftPad - rightPad) * 2; // 間隔を2倍に拡大

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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">月次売上分析</h1>
                  <p className="text-xs sm:text-sm text-gray-500">月別売上実績とカテゴリ分析</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => loadMonthlySalesData(selectedYear, selectedMonth)}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">更新</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/sales/cast-ranking?year=${selectedYear}&month=${selectedMonth}`)}
                  className="flex-1 sm:flex-none"
                >
                  <Users className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">キャストランキング</span>
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
                    <DropdownMenuItem onClick={exportToExcel}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel形式でダウンロード
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 期間選択 */}
          <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">期間選択</h3>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="year" className="text-sm font-medium text-gray-700">年</Label>
                    <Input
                      id="year"
                      type="number"
                      min="2020"
                      max="2030"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-20 h-10 text-center font-semibold border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-0.5 bg-purple-300"></div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="month" className="text-sm font-medium text-gray-700">月</Label>
                    <select
                      id="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-24 h-10 px-3 py-2 text-center font-semibold border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}月
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMonthlySalesData(selectedYear, selectedMonth)}
                    className="h-10 px-4 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    更新
                  </Button> */}
                </div>
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
                  {/* <span className="flex items-center text-sm text-blue-700">(指名料とサービス手数料を含む)</span> */}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {formatCurrency(salesData.sessions_total_cost || 0)}
                </div>
                <div className="text-sm text-blue-700 mb-1">
                  月間売上: {formatCurrency(salesData.total_yen)}
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前月比 +8.2%
                </div>
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
                  前月比 +5.1%
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
                  前月比 +12.3%
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
                  {salesData.avg_customer_spend ? `¥${new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(salesData.avg_customer_spend)}` : '¥0.00'}
                </div>
                <div className="flex items-center text-sm text-orange-700">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  前月比 +3.1%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 日別売上（折れ線グラフ） */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>日別売上高（折れ線）</CardTitle>
            </CardHeader>
            <CardContent>
              {dailySales.length === 0 ? (
                <div className="text-sm text-gray-500">データがありません</div>
              ) : (
                <div className="flex flex-col lg:flex-row items-start space-y-4 lg:space-y-0 lg:space-x-4">
					<div className="flex-1 w-full">
						<div className="relative h-64 bg-gray-50 rounded-lg p-4">
                      <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1={leftPad}
                        y1={topPad + i * ((chartHeight - topPad - bottomPad) / 4)}
                        x2={svgWidth - rightPad}
                        y2={topPad + i * ((chartHeight - topPad - bottomPad) / 4)}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                      />
                      ))}

                    {/* Y軸ラベル（金額） */}
                    {[0, 1, 2, 3, 4].map((i) => {
                      const y = topPad + i * ((chartHeight - topPad - bottomPad) / 4);
                      const value = (dailyMax || 0) * (1 - i / 4);
                      return (
                        <text
                          key={`ylabel-${i}`}
                          x={leftPad - 8}
                          y={y}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fill="#6B7280"
                          fontSize="10"
                        >
                          {formatCurrency(Math.round(value))}
                        </text>
                      );
                    })}

                      <polyline
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="3"
                        points={dailySales
                          .map((item: any, index: number) => {
                            const plotWidth = svgWidth - leftPad - rightPad;
                            const x = leftPad + index * (plotWidth / Math.max(1, dailySales.length - 1));
                            const y = chartHeight - bottomPad - ((item.value / (dailyMax || 1)) * (chartHeight - topPad - bottomPad));
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />

                      {dailySales.map((item: any, index: number) => {
                        const plotWidth = svgWidth - leftPad - rightPad;
                        const x = leftPad + index * (plotWidth / Math.max(1, dailySales.length - 1));
                        const y = chartHeight - bottomPad - ((item.value / (dailyMax || 1)) * (chartHeight - topPad - bottomPad));
                        return (
                          <circle key={index} cx={x} cy={y} r="3.5" fill="#8B5CF6">
                            <title>{`${item.date}: ${formatCurrency(item.value)}`}</title>
                          </circle>
                        );
                      })}
                      </svg>

                      <div className="absolute inset-0 pointer-events-none">
                      {dailySales.map((item: any, index: number) => {
                        const step = Math.ceil(dailySales.length / 6);
                        if (index % step !== 0) return null;
                        const plotWidth = svgWidth - leftPad - rightPad;
                        const x = leftPad + index * (plotWidth / Math.max(1, dailySales.length - 1));
                        const xPercent = (x / svgWidth) * 100;
                          return (
                            <span
                              key={index}
                              className="absolute text-xs text-gray-500"
                              style={{ left: `${xPercent}%`, bottom: '6px', transform: 'translateX(-50%)' }}
                            >
                              {item.date}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-56">
                    <div className="flex flex-row lg:flex-col space-x-4 lg:space-x-0 lg:space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 flex-1 lg:flex-none">
                        <div className="text-xs text-green-700">最高売上日</div>
                        <div className="text-sm font-semibold text-green-900">{maxItem?.date || '-'}</div>
                        <div className="text-lg font-bold text-green-800">{maxItem ? formatCurrency(maxItem.value) : '-'}</div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 flex-1 lg:flex-none">
                        <div className="text-xs text-red-700">最低売上日</div>
                        <div className="text-sm font-semibold text-red-900">{minItem?.date || '-'}</div>
                        <div className="text-lg font-bold text-red-800">{minItem ? formatCurrency(minItem.value) : '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 日別売上確認表（折れ線の下） */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>日別売上確認表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[420px] overflow-auto rounded-md border relative">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b shadow-sm">
                    <TableRow className="sticky top-0">
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur w-28">日付</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-right">売上合計</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-right">現金</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-right">店舗用カード</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-right">クレジットカード</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-right">顧客数</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-right">キャスト給与</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-right">経費金額</TableHead>
                      <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur text-center">詳細情報</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyCheckRows.map((r: any) => (
                      <TableRow key={r.date}>
                        <TableCell className="font-medium">{r.date}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(r.total_sales) || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(r.cash_sales) || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(r.store_card_sales) || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(r.credit_card_sales) || 0)}</TableCell>
                        <TableCell className="text-right">{formatNumber(Number(r.customer_count) || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(r.cast_salary) || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(r.deduct_total) || 0)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/sales/daily?date=${encodeURIComponent(r.date)}`)}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            詳細
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カテゴリ別売上 */}
            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categorySales.map((category) => (
                    <div key={category.category_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          {category.category_name === 'ボトル' ? (
                            <Wine className="w-5 h-5 text-purple-600" />
                          ) : (
                            <Utensils className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{category.category_name}</h4>
                          <p className="text-sm text-gray-500">{formatNumber(Math.round(Number(category.quantity) || 0))}件</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          {formatCurrency(category.total_sales)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* 製品別売上 */}
            <Card>
              <CardHeader>
                <CardTitle>製品別売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productSales.map((product) => (
                    <div key={product.product_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{product.product_name}</h4>
                          <p className="text-sm text-gray-500">{formatNumber(Math.round(Number(product.quantity) || 0))}件</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          {formatCurrency(product.total_sales)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* スタッフ別売上 */}
            <Card>
              <CardHeader>
                <CardTitle>スタッフ別売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {castSales.map((cast, index) => (
                    <div key={cast.cast_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-purple-600">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{cast.cast_name}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          {formatCurrency(cast.total_sales)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}