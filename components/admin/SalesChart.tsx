'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, 
  Calendar, Clock, Users, Package
} from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';

interface SalesData {
  date: string;
  sales: number;
  orders: number;
  customers: number;
}

interface CategoryData {
  name: string;
  sales: number;
  percentage: number;
  color: string;
}

interface SalesChartProps {
  period: 'daily' | 'weekly' | 'monthly';
  data?: SalesData[];
  categoryData?: CategoryData[];
  selectedDate?: string; // YYYY-MM-DD（daily のとき使用）
}

// Mock data generator
const generateMockData = (period: 'daily' | 'weekly' | 'monthly'): SalesData[] => {
  const dataPoints = period === 'daily' ? 24 : period === 'weekly' ? 7 : 30;
  const data: SalesData[] = [];
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    let date: string;
    let baseSales = 0;
    
    if (period === 'daily') {
      date = `${23 - i}:00`;
      // Simulate hourly patterns
      const hour = 23 - i;
      if (hour >= 18 && hour <= 23) {
        baseSales = Math.random() * 200000 + 100000; // Peak hours
      } else if (hour >= 12 && hour <= 17) {
        baseSales = Math.random() * 100000 + 50000; // Afternoon
      } else {
        baseSales = Math.random() * 30000 + 10000; // Off hours
      }
    } else if (period === 'weekly') {
      const days = ['月', '火', '水', '木', '金', '土', '日'];
      date = days[6 - i];
      // Weekend patterns
      if (i === 0 || i === 1) { // Fri, Sat
        baseSales = Math.random() * 500000 + 300000;
      } else if (i === 2) { // Sunday
        baseSales = Math.random() * 400000 + 200000;
      } else {
        baseSales = Math.random() * 300000 + 150000;
      }
    } else {
      const date_obj = new Date();
      date_obj.setDate(date_obj.getDate() - i);
      date = date_obj.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
      baseSales = Math.random() * 600000 + 200000;
    }
    
    data.push({
      date,
      sales: Math.round(baseSales),
      orders: Math.round(baseSales / 8000) + Math.round(Math.random() * 10),
      customers: Math.round(baseSales / 15000) + Math.round(Math.random() * 5)
    });
  }
  
  return data;
};

const generateCategoryData = (): CategoryData[] => {
  return [
    { name: 'アルコール', sales: 1200000, percentage: 45, color: '#8B5CF6' },
    { name: 'フード', sales: 800000, percentage: 30, color: '#F59E0B' },
    { name: 'ソフトドリンク', sales: 400000, percentage: 15, color: '#10B981' },
    { name: 'デザート', sales: 200000, percentage: 7.5, color: '#F97316' },
    { name: 'その他', sales: 66000, percentage: 2.5, color: '#6B7280' }
  ];
};

export function SalesChart({ period, data, categoryData, selectedDate }: SalesChartProps) {
  const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'pie'>('bar');
  const [fetchedData, setFetchedData] = useState<SalesData[] | null>(null);
  const salesData = fetchedData || data || generateMockData(period);
  const catData = categoryData || generateCategoryData();

  useEffect(() => {
    const loadHourly = async () => {
      if (period !== 'daily' || !selectedDate) {
        setFetchedData(null);
        return;
      }
      try {
        const res = await fetch(`/api/admin/sales/hourly?date=${selectedDate}`);
        const result = await res.json();
        if (!result.success) {
          setFetchedData(null);
          return;
        }
        const rows: Array<{ hour: number; total_sales: string | number; distinct_products: string | number; }> = result.data.hours;
        const mapped: SalesData[] = rows.map(r => ({
          date: `${String(r.hour).padStart(2, '0')}:00`,
          sales: Math.round(Number(r.total_sales) || 0),
          orders: Number(r.distinct_products) || 0,
          customers: 0
        }));
        setFetchedData(mapped);
      } catch (_) {
        setFetchedData(null);
      }
    };
    loadHourly();
  }, [period, selectedDate]);
  
  const maxSales = Math.max(...salesData.map(d => d.sales));
  const totalSales = salesData.reduce((sum, d) => sum + d.sales, 0);
  const avgSales = totalSales / salesData.length;
  
  const growth = salesData.length > 1 
    ? ((salesData[salesData.length - 1].sales - salesData[salesData.length - 2].sales) / salesData[salesData.length - 2].sales) * 100
    : 0;

  const renderBarChart = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-900">売上推移</h4>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={activeChart === 'bar' ? 'default' : 'outline'}
            onClick={() => setActiveChart('bar')}
          >
            棒グラフ
          </Button>
          <Button
            size="sm"
            variant={activeChart === 'line' ? 'default' : 'outline'}
            onClick={() => setActiveChart('line')}
          >
            線グラフ
          </Button>
          <Button
            size="sm"
            variant={activeChart === 'pie' ? 'default' : 'outline'}
            onClick={() => setActiveChart('pie')}
          >
            円グラフ
          </Button>
        </div>
      </div>

      {activeChart === 'bar' && (
        <div className="space-y-2">
          {salesData.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-16 text-sm text-gray-600 text-right">
                {item.date}
              </div>
              <div className="flex-1 flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                    style={{ width: `${(item.sales / maxSales) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">
                      {formatCurrency(item.sales)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-20 text-sm text-gray-600 text-center">
                {item.orders}件
              </div>
            </div>
          ))}
        </div>
      )}

      {activeChart === 'line' && (
        <div className="relative h-64 bg-gray-50 rounded-lg p-4">
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1="40"
                y1={40 + i * 32}
                x2="380"
                y2={40 + i * 32}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
            ))}
            
            {/* Sales line */}
            <polyline
              fill="none"
              stroke="url(#salesGradient)"
              strokeWidth="3"
              points={salesData.map((item, index) => 
                `${40 + (index * (340 / (salesData.length - 1)))},${200 - 40 - (item.sales / maxSales) * 120}`
              ).join(' ')}
            />
            
            {/* Data points */}
            {salesData.map((item, index) => (
              <circle
                key={index}
                cx={40 + (index * (340 / (salesData.length - 1)))}
                cy={200 - 40 - (item.sales / maxSales) * 120}
                r="4"
                fill="#8B5CF6"
                className="hover:r-6 transition-all cursor-pointer"
              >
                <title>{`${item.date}: ${formatCurrency(item.sales)}`}</title>
              </circle>
            ))}
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="salesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Axis labels */}
          <div className="absolute bottom-2 left-10 right-10 flex justify-between text-xs text-gray-500">
            {salesData.map((item, index) => 
              index % Math.ceil(salesData.length / 6) === 0 && (
                <span key={index}>{item.date}</span>
              )
            )}
          </div>
        </div>
      )}

      {activeChart === 'pie' && (
        <div className="flex items-center justify-center space-x-8">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {catData.map((category, index) => {
                const startAngle = catData.slice(0, index).reduce((sum, c) => sum + (c.percentage * 3.6), 0);
                const endAngle = startAngle + (category.percentage * 3.6);
                const largeArcFlag = category.percentage > 50 ? 1 : 0;
                
                const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
                
                return (
                  <path
                    key={category.name}
                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={category.color}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <title>{`${category.name}: ${category.percentage}%`}</title>
                  </path>
                );
              })}
            </svg>
          </div>
          
          <div className="space-y-2">
            {catData.map((category) => (
              <div key={category.name} className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{category.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(category.sales)} ({category.percentage}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-700">合計売上</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">平均売上</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(avgSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${growth >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className={`w-8 h-8 ${growth >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center mr-3`}>
                {growth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div>
                <p className={`text-sm ${growth >= 0 ? 'text-green-700' : 'text-red-700'}`}>成長率</p>
                <p className={`text-xl font-bold ${growth >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <Package className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-700">総注文数</p>
                <p className="text-xl font-bold text-purple-900">
                  {salesData.reduce((sum, d) => sum + d.orders, 0)}件
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            売上分析 - {period === 'daily' ? '時間別' : period === 'weekly' ? '曜日別' : '日別'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderBarChart()}
        </CardContent>
      </Card>

      {/* Period Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            分析インサイト
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">最高売上</h4>
              <div className="bg-green-50 p-3 rounded-lg">
                {(() => {
                  const maxItem = salesData.reduce((max, item) => item.sales > max.sales ? item : max);
                  return (
                    <div>
                      <p className="text-green-800 font-bold">{formatCurrency(maxItem.sales)}</p>
                      <p className="text-green-600 text-sm">{maxItem.date}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">最低売上</h4>
              <div className="bg-red-50 p-3 rounded-lg">
                {(() => {
                  const minItem = salesData.reduce((min, item) => item.sales < min.sales ? item : min);
                  return (
                    <div>
                      <p className="text-red-800 font-bold">{formatCurrency(minItem.sales)}</p>
                      <p className="text-red-600 text-sm">{minItem.date}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
