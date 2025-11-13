
'use client';

import { MdOutlineCalendarMonth, MdOutlinePriceChange } from "react-icons/md"; 
import { FaRegChartBar } from "react-icons/fa"; 
import { BsFillMenuButtonWideFill } from "react-icons/bs"; 
import { GiTimeTrap } from "react-icons/gi"; 
import { AiFillMoneyCollect } from "react-icons/ai"; 
import { FaPercentage } from "react-icons/fa"; 
import { FiUserPlus } from "react-icons/fi"; 
import { MdWifiCalling3 } from "react-icons/md"; 
import { TbBellRinging } from "react-icons/tb"; 
import { MdOutlineTableRestaurant } from "react-icons/md"; 
import { FaUserTie } from 'react-icons/fa'; 
import { MdRoomService } from "react-icons/md"; 
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, hasRole, AuthUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wine, Users, BarChart3, Clock, CreditCard, Settings,
  Shield, TrendingUp, Calendar, DollarSign,
  FileText, AlertCircle, Star, Bell, Crown, Table
} from 'lucide-react';
import { formatCurrency, formatDateTime, mockAttendance, mockBottles } from '@/lib/mock-data';
import { getCurrentBackRate, formatBackRate } from '@/lib/cast-back-system';
import { useNotificationContext } from '@/lib/notification-context';
import RealTimeTableStatus from '@/components/admin/RealTimeTableStatus';

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [castUser, setCastUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingServiceOrderCount, setPendingServiceOrderCount] = useState(0);
  const [pendingManagerCallCount, setPendingManagerCallCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [todaySalesKpi, setTodaySalesKpi] = useState<{ total_yen: number; customer_count: number; order_count: number }>({ total_yen: 0, customer_count: 0, order_count: 0 });
  const [showTableStatus, setShowTableStatus] = useState(false);
  const [lastServiceOrderCount, setLastServiceOrderCount] = useState(0);
  const [lastManagerCallCount, setLastManagerCallCount] = useState(0);
  const router = useRouter();
  const { success } = useNotificationContext();

  const loadPendingOrderCount = async () => {
    try {
      const response = await fetch('/api/salesorder?status=pending');
      const result = await response.json();
      
      if (result.success) {
        setPendingOrderCount(result.data.length);
      }
    } catch (err) {
      console.error('売上注文数取得エラー:', err);
    }
  };

  const loadPendingServiceOrderCount = async () => {
    try {
      const response = await fetch('/api/serviceorder?status=pending');
      const result = await response.json();
      
      if (result.success) {
        const currentCount = result.data.length;
        // 新しいサービスリクエストを検出
        if (currentCount > lastServiceOrderCount && lastServiceOrderCount > 0) {
          const newOrders = result.data.slice(0, currentCount - lastServiceOrderCount);
          newOrders.forEach((order: any) => {
            success('新しいサービスリクエスト', `${order.table_name || 'テーブル'}からサービスリクエストが届きました`);
          });
        }
        setPendingServiceOrderCount(currentCount);
        setLastServiceOrderCount(currentCount);
      }
    } catch (err) {
      console.error('サービス注文数取得エラー:', err);
    }
  };

  const loadPendingManagerCallCount = async () => {
    try {
      const response = await fetch('/api/callmanager?status=pending');
      const result = await response.json();
      
      if (result.success) {
        const currentCount = result.data.length;
        // 新しいスタッフ呼び出しリクエストを検出
        if (currentCount > lastManagerCallCount && lastManagerCallCount > 0) {
          const newCalls = result.data.slice(0, currentCount - lastManagerCallCount);
          newCalls.forEach((call: any) => {
            success('新しいスタッフ呼び出し', `${call.cast_name || 'キャスト'}から${call.table_name || 'テーブル'}へのスタッフ呼び出しリクエストが届きました`);
          });
        }
        setPendingManagerCallCount(currentCount);
        setLastManagerCallCount(currentCount);
      }
    } catch (err) {
      console.error('スタッフ呼び出し数取得エラー:', err);
    }
  };

  const loadUnreadNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications?status=unread');
      const result = await response.json();
      
      if (result.success) {
        setUnreadNotificationCount(result.data.length);
      }
    } catch (err) {
      console.error('未読通知数取得エラー:', err);
    }
  };

  useEffect(() => {
    // 管理者認証情報を確認
    const adminAuth = localStorage.getItem('admin_auth');
    console.log('Dashboard: 管理者認証情報:', adminAuth);
    if (adminAuth) {
      try {
        const parsedAdminAuth = JSON.parse(adminAuth);
        console.log('Dashboard: 解析された管理者認証情報:', parsedAdminAuth);
        setAdminUser(parsedAdminAuth);
        setIsLoading(false);
        loadPendingOrderCount(); // 注文リクエスト数を取得
        loadPendingServiceOrderCount(); // サービス注文リクエスト数を取得
        
        // 30秒ごとに注文リクエスト数を更新
        const interval = setInterval(() => {
          loadPendingOrderCount();
          loadPendingServiceOrderCount();
        }, 30000);
        return () => clearInterval(interval);
      } catch (error) {
        console.error('管理者認証情報の解析に失敗しました:', error);
        localStorage.removeItem('admin_auth');
      }
    }
    
    // キャスト認証情報を確認
    const castAuth = localStorage.getItem('cast_auth');
    if (castAuth) {
      try {
        const parsedCastAuth = JSON.parse(castAuth);
        setCastUser(parsedCastAuth);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('キャスト認証情報の解析に失敗しました:', error);
        localStorage.removeItem('cast_auth');
      }
    }
    
    // 従来の認証システムも確認
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    // キャスト・管理者・システム管理者のみアクセス可能
    if (!currentUser.roles.some(role => ['cast', 'admin', 'superadmin'].includes(role))) {
      router.push('/login');
      return;
    }
    
    setUser(currentUser);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    if (adminUser || user) {
      loadPendingOrderCount();
      loadPendingServiceOrderCount();
      loadPendingManagerCallCount();
      loadUnreadNotificationCount();
      // 本日KPIを日次売上APIから取得
      const today = new Date().toISOString().split('T')[0];
      fetch(`/api/admin/sales/daily?date=${today}`)
        .then((res) => res.json())
        .then((result) => {
          if (result?.success) {
            const { total_sales, visitor_count, order_count } = result.data || {};
            setTodaySalesKpi({ total_yen: Number(total_sales || 0), customer_count: Number(visitor_count || 0), order_count: Number(order_count || 0) });
          } else {
            setTodaySalesKpi({ total_yen: 0, customer_count: 0, order_count: 0 });
          }
        })
        .catch(() => setTodaySalesKpi({ total_yen: 0, customer_count: 0, order_count: 0 }));
    }
  }, [adminUser, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !adminUser && !castUser) return null;

  // 現在のユーザー情報（管理者認証、キャスト認証、または従来の認証）
  const currentUser = adminUser || castUser || user;

  // 今日の売上データ（API取得値）
  const todaySales = todaySalesKpi;
  
  // 自分の勤怠データ
  const myAttendance = mockAttendance.find(a => a.staff_id === currentUser?.id);
  
  // 在庫少の品目（残量が20%以下のボトル）
  const lowStockBottles = mockBottles.filter(bottle => {
    const percentage = (bottle.remaining_ml / bottle.total_ml) * 100;
    return bottle.status === 'active' && percentage <= 20;
  });

  // キャストの現在のバック率
  const currentBackRate = currentUser ? getCurrentBackRate(currentUser.id) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Wine className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">NightWork POS</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">銀座エレガンス</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.name || 'ユーザー'}</p>
                <div className="flex space-x-1">
                  {adminUser ? (
                    <Badge variant="secondary" className="text-xs">
                      {adminUser.role === 'admin' ? '管理者' : 
                       adminUser.role === 'superadmin' ? 'システム管理者' : adminUser.role}
                    </Badge>
                  ) : castUser ? (
                    <Badge variant="secondary" className="text-xs">
                      キャスト
                    </Badge>
                  ) : user ? (
                    user.roles.map(role => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role === 'cast' ? 'キャスト' : 
                         role === 'admin' ? '管理者' : 
                         role === 'superadmin' ? 'システム管理者' : role}
                      </Badge>
                    ))
                  ) : null}
                </div>
              </div>
              <div className="sm:hidden">
                <Badge variant="secondary" className="text-xs">
                  {adminUser ? (
                    adminUser.role === 'admin' ? '管理者' : 
                    adminUser.role === 'superadmin' ? 'システム管理者' : adminUser.role
                  ) : castUser ? (
                    'キャスト'
                  ) : user ? (
                    user.roles.includes('superadmin') ? 'システム管理者' :
                    user.roles.includes('admin') ? '管理者' : 'キャスト'
                  ) : 'ユーザー'}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => {
                  localStorage.removeItem('auth_user');
                  localStorage.removeItem('admin_auth');
                  localStorage.removeItem('cast_auth');
                  router.push('/login');
                }}
              >
                <span className="hidden sm:inline">ログアウト</span>
                <span className="sm:hidden">退出</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            おかえりなさい、{currentUser?.name || 'ユーザー'}さん
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {formatDateTime(new Date().toISOString())} - 今日も一日お疲れ様です
          </p>
        </div>

        {/* Cast Dashboard */}
        {((castUser && castUser.role === 'cast') || hasRole(user, 'cast')) && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                キャスト
              </h1>
              <p className="text-gray-600">
                お客様対応・注文管理・会計業務
              </p>
            </div>
            {/* 勤怠状況 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-blue-800">
                    <Clock className="w-5 h-5 mr-2" />
                    本日の勤怠
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myAttendance ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">出勤時刻</span>
                        <span className="font-medium text-blue-900">
                          {formatDateTime(myAttendance.clock_in)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">休憩時間</span>
                        <span className="font-medium text-blue-900">
                          {myAttendance.break_minutes}分
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">稼働時間</span>
                        <span className="font-medium text-blue-900">
                          約{Math.floor((new Date().getTime() - new Date(myAttendance.clock_in).getTime()) / (1000 * 60 * 60))}時間
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-blue-700 mb-3">まだ出勤していません</p>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push('/cast/attendance')}
                      >
                        出勤する
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-green-800">
                    <DollarSign className="w-5 h-5 mr-2" />
                    今月の見込給与
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">基本給</span>
                      <span className="font-medium text-green-900">¥180,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">指名料</span>
                      <span className="font-medium text-green-900">¥45,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">ドリンクバック</span>
                      <span className="font-medium text-green-900">¥32,000</span>
                    </div>
                    <hr className="border-green-300" />
                    <div className="flex justify-between font-bold">
                      <span className="text-green-800">合計見込</span>
                      <span className="text-green-900">¥257,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-purple-800">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    今日の実績
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">指名数</span>
                      <span className="font-medium text-purple-900">3件</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">売上貢献</span>
                      <span className="font-medium text-purple-900">¥420,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">ボトル売上</span>
                      <span className="font-medium text-purple-900">¥180,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* バック率表示 */}
              {currentBackRate && (
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-green-800">
                      <DollarSign className="w-5 h-5 mr-2" />
                      現在のバック率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">フードバック</span>
                        <span className="font-medium text-green-900">{formatBackRate(currentBackRate.food_back_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">ドリンクバック</span>
                        <span className="font-medium text-green-900">{formatBackRate(currentBackRate.drink_back_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">本指名料</span>
                        <span className="font-medium text-green-900">{formatBackRate(currentBackRate.nomination_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">場内指名料</span>
                        <span className="font-medium text-green-900">{formatBackRate(currentBackRate.field_nomination_rate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* キャスト向けクイックアクション */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">主な機能</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-yellow-50 hover:border-yellow-300 rounded-none"
                  onClick={() => router.push('/cast/attendance')}
                >
                  <Clock className="w-6 h-6 text-yellow-600" />
                  <span className="text-sm font-medium">勤怠管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-red-50 hover:border-red-300 rounded-none"
                  onClick={() => router.push('/cast/payroll')}
                >
                  <DollarSign className="w-6 h-6 text-red-600" />
                  <span className="text-sm font-medium">給与確認</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-green-50 hover:border-green-300 rounded-none"
                  onClick={() => router.push('/cast/back-rates')}
                >
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium">バック率確認</span>
                </Button>

                {/* <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-purple-50 hover:border-purple-300 rounded-none"
                  onClick={() => router.push('/cast/nominations')}
                >
                  <Crown className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium">指名管理</span>
                </Button> */}
              </div>
            </div>
          </div>
        )}

        {/* Admin Dashboard */}
        {((adminUser && (adminUser.role === 'admin' || adminUser.role === 'superadmin')) || hasRole(user, 'admin')) && (
          <div className="space-y-8">
            {/* 売上KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-blue-800">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    本日売上
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900 mb-1">
                    {formatCurrency(todaySales.total_yen)}
                  </div>
                  {/* <p className="text-sm text-blue-700">
                    前日比 +12.5%
                  </p> */}
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
                    {todaySales.customer_count}組
                  </div>
                  <p className="text-sm text-green-700">
                    平均客単価 {todaySales.customer_count > 0 ? `¥${new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(todaySales.total_yen / todaySales.customer_count)}` : '¥0.00'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-purple-800">
                    <FileText className="w-5 h-5 mr-2" />
                    注文件数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900 mb-1">
                    {todaySales.order_count}件
                  </div>
                  <p className="text-sm text-purple-700">
                    平均注文額 {formatCurrency(Math.floor(todaySales.total_yen / todaySales.order_count))}
                  </p>
                </CardContent>
              </Card>

              {/* <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-orange-800">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    要確認事項
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                      <span className="text-orange-700">勤怠承認待ち: 2件</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                      <span className="text-orange-700">在庫少: {lowStockBottles.length}品目</span>
                    </div>
                    {lowStockBottles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {lowStockBottles.slice(0, 3).map((bottle, index) => (
                          <div key={index} className="text-xs text-orange-600">
                            • {bottle.name}: {Math.round((bottle.remaining_ml / bottle.total_ml) * 100)}%
                          </div>
                        ))}
                        {lowStockBottles.length > 3 && (
                          <div className="text-xs text-orange-600">
                            • 他{lowStockBottles.length - 3}品目...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card> */}
            </div>

            {/* 管理者向けクイックアクション */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">管理機能</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => router.push('/admin/sales/daily')}
                >
                  {/* <BarChart3 className="w-6 h-6 text-blue-600" /> */}
                  <span className="w-6 h-5 text-blue-600 text-xl"><FaRegChartBar /></span>
                  <span className="text-sm font-medium">日次売上</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-indigo-50 hover:border-indigo-300"
                  onClick={() => router.push('/admin/sales/monthly')}
                >
                  {/* <Calendar className="w-6 h-6 text-indigo-600" /> */}
                  <span className="w-6 h-5 text-indigo-600 text-2xl"><MdOutlineCalendarMonth /></span>
                  <span className="text-sm font-medium">月次売上</span>
                </Button>
                
                {/* <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-green-50 hover:border-green-300"
                  onClick={() => router.push('/admin/register/close')}
                >
                  <CreditCard className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium">レジ締め</span>
                </Button> */}
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-purple-50 hover:border-purple-300"
                  onClick={() => router.push('/admin/menu')}
                >
                  {/* <FileText className="w-6 h-6 text-purple-600" /> */}
                  <span className="w-6 h-5 text-purple-600 text-xl"><BsFillMenuButtonWideFill /></span>
                  <span className="text-sm font-medium">メニュー管理</span>
                </Button>
                
                {/* <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-orange-50 hover:border-orange-300"
                  onClick={() => router.push('/admin/customers')}
                >
                  <Users className="w-6 h-6 text-orange-600" />
                  <span className="text-sm font-medium">顧客管理</span>
                </Button> */}
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-pink-50 hover:border-pink-300"
                  onClick={() => router.push('/admin/attendance')}
                >
                  {/* <Users className="w-6 h-6 text-pink-600" /> */}
                  <span className="w-6 h-5 text-pink-600 text-2xl"><GiTimeTrap /></span>
                  <span className="text-sm font-medium">勤怠承認</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-yellow-50 hover:border-yellow-300"
                  onClick={() => router.push('/admin/payroll/preview')}
                >
                  {/* <DollarSign className="w-6 h-6 text-yellow-600" /> */}
                  <span className="w-6 h-5 text-yellow-600 text-2xl"><AiFillMoneyCollect /></span>
                  <span className="text-sm font-medium">給与計算</span>
                </Button>
                
                {/* <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-indigo-50 hover:border-indigo-300"
                  onClick={() => router.push('/admin/campaigns')}
                >
                  <Star className="w-6 h-6 text-indigo-600" />
                  <span className="text-sm font-medium">キャンペーン</span>
                </Button> */}
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-teal-50 hover:border-teal-300"
                  onClick={() => router.push('/admin/bottle-keep')}
                >
                  <Wine className="w-6 h-6 text-teal-600" />
                  <span className="text-sm font-medium">ボトル保管管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-indigo-50 hover:border-indigo-300"
                  onClick={() => router.push('/admin/cast-back-rates')}
                >
                  {/* <DollarSign className="w-6 h-6 text-indigo-600" /> */}
                  <span className="w-6 h-5 text-indigo-600 text-2xl"><FaPercentage /></span>
                  <span className="text-sm font-medium">バック率設定</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-slate-50 hover:border-slate-300"
                  onClick={() => router.push('/admin/add-charges')}
                >
                  <span className="w-6 h-5 text-slate-600 text-2xl"><MdOutlinePriceChange /></span>
                  <span className="text-sm font-medium">追加料金設定</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-rose-50 hover:border-rose-300"
                  onClick={() => router.push('/admin/casts')}
                >
                  {/* <Users className="w-6 h-6 text-rose-600" /> */}
                  <span className="w-6 h-5 text-rose-600 text-2xl"><FiUserPlus /></span>
                  <span className="text-sm font-medium">キャスト管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-green-50 hover:border-green-300 relative"
                  onClick={() => router.push('/admin/staff-calls')}
                >
                  {/* <Users className="w-6 h-6 text-green-600" /> */}
                  <span className="w-6 h-5 text-green-600 text-2xl"><MdWifiCalling3 /></span>
                  <span className="text-sm font-medium">スタッフ呼び出し</span>
                  {pendingManagerCallCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                      {pendingManagerCallCount}
                    </Badge>
                  )}
                </Button>
                
                {/* <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-purple-50 hover:border-purple-300"
                  onClick={() => router.push('/admin/nominations')}
                >
                  <Crown className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium">指名管理</span>
                </Button> */}
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-orange-50 hover:border-orange-300 relative"
                  onClick={() => router.push('/admin/order-monitoring')}
                >
                  <div className="relative">
                    {/* <Bell className="w-6 h-6 text-orange-600" /> */}
                    <span className="w-6 h-5 text-orange-600 text-2xl"><TbBellRinging /></span>
                    {(pendingOrderCount > 0 || pendingServiceOrderCount > 0) && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {pendingOrderCount + pendingServiceOrderCount}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">注文監視</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-cyan-50 hover:border-cyan-300"
                  onClick={() => router.push('/admin/tables')}
                >
                  {/* <Table className="w-6 h-6 text-cyan-600" /> */}
                  <span className="w-6 h-5 text-cyan-600 text-2xl"><MdOutlineTableRestaurant /></span>
                  <span className="text-sm font-medium">テーブル管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-green-50 hover:border-green-300"
                  onClick={() => router.push('/admin/services')}
                >
                  {/* <Settings className="w-6 h-6 text-green-600" /> */}
                  <span className="w-6 h-5 text-green-600 text-2xl"><MdRoomService /></span>
                  <span className="text-sm font-medium">サービス管理</span>
                </Button>

              <Button 
                variant="outline" 
                className="h-24 flex-col space-y-2 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => router.push('/admin/profile')}
              >
                {/* <User className="w-6 h-6 text-gray-700" /> */}
                <span className="w-6 h-5 text-gray-700 text-xl"><FaUserTie /></span>
                
                <span className="text-sm font-medium">管理者情報管理</span>
              </Button>
              </div>
            </div>
          </div>
        )}

        {/* SuperAdmin Dashboard */}
        {((adminUser && adminUser.role === 'superadmin') || hasRole(user, 'superadmin')) && (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">システム管理</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => router.push('/super/stores')}
                >
                  <Settings className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium">店舗管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-red-50 hover:border-red-300"
                  onClick={() => router.push('/super/audit')}
                >
                  <Shield className="w-6 h-6 text-red-600" />
                  <span className="text-sm font-medium">監査ログ</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Real-Time Table Status Button (Admin only on Dashboard) */}
      {(adminUser || hasRole(user, 'admin') || hasRole(user, 'superadmin')) && (
        <>
          <button
            onClick={() => setShowTableStatus(true)}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
            aria-label="リアルタイムテーブル状態"
          >
            <Table className="w-6 h-6" />
            <span className="hidden sm:inline font-medium">テーブル状態</span>
          </button>
          <RealTimeTableStatus 
            open={showTableStatus} 
            onClose={() => setShowTableStatus(false)} 
          />
        </>
      )}
    </div>
  );
}