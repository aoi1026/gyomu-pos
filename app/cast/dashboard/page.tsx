'use client';

import { BiUserPin } from "react-icons/bi"; 
import { MdOutlineAreaChart } from "react-icons/md"; 
import { GrAchievement } from "react-icons/gr"; 
import { AiFillMoneyCollect } from "react-icons/ai"; 
import { useEffect, useState } from 'react';
import { FaUserClock } from "react-icons/fa"; 
import { useRouter } from 'next/navigation';
import { getCurrentUser, hasRole, AuthUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wine, Users, Clock, DollarSign, Star, Bell, 
  TrendingUp, Calendar, AlertCircle, CheckCircle, Target, User
} from 'lucide-react';
import { formatCurrency, formatDateTime, mockAttendance, mockBottles } from '@/lib/mock-data';
import { getCurrentBackRate, formatBackRate } from '@/lib/cast-back-system';

export default function CastDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [castUser, setCastUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyPerf, setDailyPerf] = useState<{ nominations: number; drinkSales: number; foodSales: number }>({ nominations: 0, drinkSales: 0, foodSales: 0 });
  const [storeName, setStoreName] = useState<string>('銀座エレガンス');
  const router = useRouter();

  useEffect(() => {
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

  const loadStoreName = async () => {
    try {
      const response = await fetch('/api/project-variables?name=store_name');
      const result = await response.json();
      if (result.success && result.data) {
        setStoreName(result.data.value || '銀座エレガンス');
      }
    } catch (err) {
      console.error('店舗名取得エラー:', err);
    }
  };

  // 今日の実績（DB集計）: フックは早期returnより前に配置して順序を安定化
  useEffect(() => {
    const loadDailyPerf = async () => {
      const currentUser = castUser || user;
      const id = currentUser?.id;
      if (!id) return;
      const today = new Date().toISOString().split('T')[0];
      try {
        const res = await fetch(`/api/cast/performance/daily?user_id=${String(id)}&date=${today}`);
        const result = await res.json();
        if (result?.success) {
          const nominations = Number(result.data.main_count || 0) + Number(result.data.inside_count || 0) + Number(result.data.together_count || 0);
          setDailyPerf({
            nominations,
            drinkSales: Number(result.data.drink_sales || 0),
            foodSales: Number(result.data.food_sales || 0)
          });
        } else {
          setDailyPerf({ nominations: 0, drinkSales: 0, foodSales: 0 });
        }
      } catch (e) {
        setDailyPerf({ nominations: 0, drinkSales: 0, foodSales: 0 });
      }
    };
    loadDailyPerf();
    loadStoreName();
  }, [castUser, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !castUser) return null;

  // 現在のユーザー情報（キャスト認証または従来の認証）
  const currentUser = castUser || user;
  
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">LNXS</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{storeName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.name || 'ユーザー'}</p>
                <div className="flex space-x-1">
                  {castUser ? (
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
                  {castUser ? 'キャスト' : user ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6">
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

              {/* <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
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
              </Card> */}

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-green-800">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    今日の実績
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">指名数</span>
                      <span className="font-medium text-green-900">{dailyPerf.nominations}件</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">飲料売上</span>
                      <span className="font-medium text-green-900">{formatCurrency(dailyPerf.drinkSales)}</span>
                    </div>
                    {/* <hr className="border-green-300" /> */}
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">食品売上</span>
                      <span className="font-medium text-green-900">{formatCurrency(dailyPerf.foodSales)}</span>
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
                  {/* <Clock className="w-6 h-6 text-yellow-600" /> */}
                  <span className="w-6 h-5 text-blue-600 text-2xl"><FaUserClock /></span>
                  <span className="text-sm font-medium">勤怠管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-red-50 hover:border-red-300 rounded-none"
                  onClick={() => router.push('/cast/payroll')}
                >
                  {/* <DollarSign className="w-6 h-6 text-red-600" /> */}
                  <span className="w-6 h-5 text-red-600 text-2xl"><AiFillMoneyCollect /></span>
                  <span className="text-sm font-medium">給与確認</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-purple-50 hover:border-purple-300 rounded-none"
                  onClick={() => router.push('/cast/performance/daily')}
                >
                  {/* <TrendingUp className="w-6 h-6 text-purple-600" /> */}
                  <span className="w-6 h-5 text-purple-600 text-xl"><GrAchievement /></span>
                  <span className="text-sm font-medium">本日の実績</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-green-50 hover:border-green-300 rounded-none"
                  onClick={() => router.push('/cast/back-rates')}
                >
                  {/* <TrendingUp className="w-6 h-6 text-green-600" /> */}
                  <span className="w-6 h-6 text-green-600 text-2xl"><MdOutlineAreaChart /></span>
                  <span className="text-sm font-medium">バック率確認</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-gray-50 hover:border-gray-300 rounded-none"
                  onClick={() => router.push('/cast/profile')}
                >
                  {/* <User className="w-6 h-6 text-gray-700" /> */}
                  <span className="w-6 h-5 text-gray-700 text-2xl"><BiUserPin /></span>
                  <span className="text-sm font-medium">個人情報管理</span>
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
        </div>
        </div>
  );
}
