'use client';
import { GrUserExpert } from "react-icons/gr"; 
import { GrUserAdmin } from "react-icons/gr"; 
import { FiLogOut } from "react-icons/fi"; 
import { MdOutlineLogout } from "react-icons/md"; 
import { MdOutlineCalendarMonth, MdOutlinePriceChange } from "react-icons/md"; 
import { FaRegChartBar } from "react-icons/fa"; 
import { BsFillMenuButtonWideFill } from "react-icons/bs"; 
import { GiTimeTrap } from "react-icons/gi"; 
import { AiFillMoneyCollect } from "react-icons/ai"; 
import { FaPowerOff } from "react-icons/fa";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wine, Users, BarChart3, Clock, CreditCard, Settings,
  Shield, TrendingUp, Calendar, DollarSign,
  FileText, AlertCircle, Star, Bell, Crown, Table, Database, Download, Upload, CheckCircle
} from 'lucide-react';
import { formatCurrency, formatDateTime, mockAttendance, mockBottles } from '@/lib/mock-data';
import { getCurrentBackRate, formatBackRate } from '@/lib/cast-back-system';
import { useNotificationContext } from '@/lib/notification-context';
import RealTimeTableStatus from '@/components/admin/RealTimeTableStatus';
import BluetoothPrinterButton from '@/components/admin/BluetoothPrinterButton';

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [castUser, setCastUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingServiceOrderCount, setPendingServiceOrderCount] = useState(0);
  const [pendingManagerCallCount, setPendingManagerCallCount] = useState(0);
  const [pendingAttendanceCount, setPendingAttendanceCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [todaySalesKpi, setTodaySalesKpi] = useState<{ total_yen: number; customer_count: number; order_count: number }>({ total_yen: 0, customer_count: 0, order_count: 0 });
  const [showTableStatus, setShowTableStatus] = useState(false);
  const [lastServiceOrderCount, setLastServiceOrderCount] = useState(0);
  const [lastManagerCallCount, setLastManagerCallCount] = useState(0);
  const [storeName, setStoreName] = useState<string>('銀座エレガンス');
  const [showStoreNameDialog, setShowStoreNameDialog] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState<string>('');
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [backupFiles, setBackupFiles] = useState<Array<{ filename: string; size: number; created: string }>>([]);
  const [selectedBackupFile, setSelectedBackupFile] = useState<string>('');
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const router = useRouter();
  const { success, error } = useNotificationContext();

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

  const loadPendingAttendanceCount = async () => {
    try {
      const response = await fetch('/api/attendance?status=pending');
      const result = await response.json();
      if (result.success) {
        setPendingAttendanceCount(result.data.length);
      }
    } catch (err) {
      console.error('勤怠承認待ち件数取得エラー:', err);
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
        loadPendingManagerCallCount(); // スタッフ呼び出し数を取得
        loadPendingAttendanceCount(); // 勤怠承認待ち件数を取得
        
        // 5秒ごとに注文リクエスト数とスタッフ呼び出し数を更新（即時反映のため）
        const interval = setInterval(() => {
          loadPendingOrderCount();
          loadPendingServiceOrderCount();
          loadPendingManagerCallCount();
          loadPendingAttendanceCount();
        }, 5000);
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
    if (!currentUser.roles.some(role => ['cast', 'admin', 'super_admin', 'superadmin'].includes(role))) {
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

  const handleStoreNameUpdate = async () => {
    if (!storeNameInput.trim()) {
      error('エラー', '店舗名を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/project-variables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'store_name',
          value: storeNameInput.trim()
        })
      });

      const result = await response.json();
      if (result.success) {
        setStoreName(storeNameInput.trim());
        setShowStoreNameDialog(false);
        setStoreNameInput('');
        success('店舗名を更新しました', '店舗名が正常に更新されました');
      } else {
        error('エラー', result.error || '店舗名の更新に失敗しました');
      }
    } catch (err) {
      console.error('店舗名更新エラー:', err);
      error('エラー', '店舗名の更新に失敗しました');
    }
  };

  const loadBackupFiles = async () => {
    setIsLoadingBackups(true);
    try {
      const response = await fetch('/api/backup');
      const result = await response.json();
      if (result.success) {
        setBackupFiles(result.files);
      } else {
        error('エラー', result.error || 'バックアップファイルリストの取得に失敗しました');
      }
    } catch (err) {
      console.error('バックアップファイルリスト取得エラー:', err);
      error('エラー', 'バックアップファイルリストの取得に失敗しました');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        success('バックアップ完了', `バックアップが完了しました: ${result.filename}`);
        await loadBackupFiles();
      } else {
        error('エラー', result.error || 'バックアップに失敗しました');
      }
    } catch (err) {
      console.error('バックアップエラー:', err);
      error('エラー', 'バックアップに失敗しました');
    }
  };

  const handleRestore = async () => {
    if (!selectedBackupFile) {
      error('エラー', 'バックアップファイルを選択してください');
      return;
    }

    setIsRestoring(true);
    try {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedBackupFile }),
      });
      const result = await response.json();
      if (result.success) {
        success('復元完了', 'データベースの復元が完了しました');
        setShowBackupDialog(false);
        setShowRestoreDialog(false);
        setSelectedBackupFile('');
      } else {
        error('エラー', result.error || 'データベースの復元に失敗しました');
      }
    } catch (err) {
      console.error('リストアエラー:', err);
      error('エラー', 'データベースの復元に失敗しました');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  useEffect(() => {
    if (adminUser || user) {
      loadPendingOrderCount();
      loadPendingServiceOrderCount();
      loadPendingManagerCallCount();
      loadUnreadNotificationCount();
      loadStoreName();
      // 本日KPIを日次売上APIから取得
      const today = new Date().toISOString().split('T')[0];
      fetch(`/api/admin/sales/daily?date=${today}`)
        .then((res) => res.json())
        .then((result) => {
          if (result?.success) {
            const { total_sales, visitor_count, order_count, total_payments } = result.data || {};
            // session_paymentsテーブルの本日のamount合計を表示
            const displayTotal = total_payments !== undefined ? total_payments : 0;
            setTodaySalesKpi({ total_yen: Number(displayTotal || 0), customer_count: Number(visitor_count || 0), order_count: Number(order_count || 0) });
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">LNXS</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{storeName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-0 sm:space-x-4">
              {((adminUser && (adminUser.role === 'admin' || adminUser.role === 'super_admin' || adminUser.role === 'superadmin')) || hasRole(user, 'admin') || hasRole(user, 'super_admin') || hasRole(user, 'superadmin')) && (
                <>
                  <BluetoothPrinterButton />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={async () => {
                      setShowBackupDialog(true);
                      await loadBackupFiles();
                    }}
                  >
                    <Database className="w-4 h-4 " />
                    {/* <span className="hidden sm:inline">バックアップ</span> */}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => {
                      setStoreNameInput(storeName);
                      setShowStoreNameDialog(true);
                    }}
                  >
                    <Settings className="w-4 h-4 sm:w-4 sm:h-4" />
                    {/* <span className="hidden sm:inline">店舗名設定</span>
                    <span className="sm:hidden">設定</span> */}
                  </Button>
                </>
              )}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.name || 'ユーザー'}</p>
                <div className="flex space-x-1">
                  {adminUser ? (
                    <Badge variant="secondary" className="text-xs">
                      {adminUser.role === 'admin' ? '管理者' : 
                       (adminUser.role === 'super_admin' || adminUser.role === 'superadmin') ? 'システム管理者' : adminUser.role}
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
                         (role === 'super_admin' || role === 'superadmin') ? 'システム管理者' : role}
                      </Badge>
                    ))
                  ) : null}
                </div>
              </div>
              <div className="sm:hidden">
                <Badge variant="secondary" className="text-xs">
                  {adminUser ? (
                    adminUser.role === 'admin' ? <GrUserExpert /> : 
                    (adminUser.role === 'super_admin' || adminUser.role === 'superadmin') ? <GrUserAdmin /> : adminUser.role
                  ) : castUser ? (
                    'キャスト'
                  ) : user ? (
                    (user.roles.includes('super_admin') || user.roles.includes('superadmin')) ? <GrUserAdmin /> :
                    user.roles.includes('admin') ? <GrUserExpert /> : 'キャスト'
                  ) : 'ユーザー'}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => setShowLogoutDialog(true)}
              >
                <span className=" hidden sm:inline"><FiLogOut /></span>
                <span className="text-sm sm:hidden"><FiLogOut /></span>
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
        {((adminUser && (adminUser.role === 'admin' || adminUser.role === 'super_admin' || adminUser.role === 'superadmin')) || hasRole(user, 'admin') || hasRole(user, 'super_admin') || hasRole(user, 'superadmin')) && (
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
                    {todaySales.customer_count}名
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
                  className="h-24 flex-col space-y-2 hover:bg-pink-50 hover:border-pink-300 relative"
                  onClick={() => router.push('/admin/attendance')}
                >
                  {/* <Users className="w-6 h-6 text-pink-600" /> */}
                  <span className="w-6 h-5 text-pink-600 text-2xl"><GiTimeTrap /></span>
                  <span className="text-sm font-medium">勤怠承認</span>
                  {pendingAttendanceCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {pendingAttendanceCount}
                    </div>
                  )}
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
                
                {/*  <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-indigo-50 hover:border-indigo-300"
                  onClick={() => router.push('/admin/cast-back-rates')}
                >
                 <DollarSign className="w-6 h-6 text-indigo-600" /> 
                  <span className="w-6 h-5 text-indigo-600 text-2xl"><FaPercentage /></span>
                  <span className="text-sm font-medium">バック率設定</span>
                </Button> */}
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-cyan-50 hover:border-cyan-300"
                  onClick={() => router.push('/admin/shifts')}
                >
                  <Calendar className="w-6 h-6 text-cyan-600" />
                  <span className="text-sm font-medium">シフト管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-slate-50 hover:border-slate-300"
                  onClick={() => router.push('/admin/add-charges')}
                >
                  <span className="w-6 h-5 text-slate-600 text-2xl"><MdOutlinePriceChange /></span>
                  <span className="text-sm font-medium">料金設定</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-emerald-50 hover:border-emerald-300"
                  onClick={() => router.push('/admin/salary-settings')}
                >
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                  <span className="text-sm font-medium">給与項目管理</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2 hover:bg-rose-50 hover:border-rose-300"
                  onClick={() => router.push('/admin/casts')}
                >
                  {/* <Users className="w-6 h-6 text-rose-600" /> */}
                  <span className="w-6 h-5 text-rose-600 text-2xl"><FiUserPlus /></span>
                  <span className="text-sm font-medium">スタッフ管理</span>
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
        {/* {((adminUser && (adminUser.role === 'super_admin' || adminUser.role === 'superadmin')) || hasRole(user, 'super_admin') || hasRole(user, 'superadmin')) && (
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
        )} */}
      </div>

      {/* Floating Real-Time Table Status Button (Admin only on Dashboard) */}
      {(adminUser || hasRole(user, 'admin') || hasRole(user, 'super_admin') || hasRole(user, 'superadmin')) && (
        <>
          <button
            onClick={() => setShowTableStatus(true)}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
            aria-label="リアルタイムテーブル状態"
          >
            <Table className="w-6 h-6" />
            {/* <span className="hidden sm:inline font-medium">テーブル状態</span> */}
          </button>
          <RealTimeTableStatus 
            open={showTableStatus} 
            onClose={() => setShowTableStatus(false)} 
          />
        </>
      )}

      {/* 店舗名設定ダイアログ */}
      <Dialog open={showStoreNameDialog} onOpenChange={setShowStoreNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              店舗名設定
            </DialogTitle>
            <DialogDescription>
              店舗名を変更します
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">店舗名</Label>
              <Input
                id="store-name"
                type="text"
                placeholder="店舗名を入力"
                value={storeNameInput}
                onChange={(e) => setStoreNameInput(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStoreNameDialog(false);
                  setStoreNameInput('');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleStoreNameUpdate}
                disabled={!storeNameInput.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* バックアップダイアログ */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              データベースバックアップ管理
            </DialogTitle>
            <DialogDescription>
              バックアップファイルの作成と復元を行います
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={handleCreateBackup}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                新規バックアップ作成
              </Button>
            </div>

            <div className="space-y-2">
              <Label>バックアップファイル一覧</Label>
              {isLoadingBackups ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">読み込み中...</p>
                </div>
              ) : backupFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>バックアップファイルがありません</p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {backupFiles.map((file) => (
                    <div
                      key={file.filename}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedBackupFile === file.filename ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedBackupFile(file.filename)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{file.filename}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <span>サイズ: {formatFileSize(file.size)}</span>
                            <span className="mx-2">•</span>
                            <span>作成日時: {new Date(file.created).toLocaleString('ja-JP')}</span>
                          </div>
                        </div>
                        {selectedBackupFile === file.filename && (
                          <div className="ml-4">
                            <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBackupDialog(false);
                  setSelectedBackupFile('');
                }}
              >
                閉じる
              </Button>
              <Button
                onClick={() => {
                  if (selectedBackupFile) {
                    setShowRestoreDialog(true);
                  } else {
                    error('エラー', 'バックアップファイルを選択してください');
                  }
                }}
                disabled={!selectedBackupFile}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                選択したファイルで復元
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* リストア確認ダイアログ */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              データベース復元の確認
            </DialogTitle>
            <DialogDescription>
              この操作は取り消せません
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900 mb-1">警告</p>
                  <p className="text-sm text-orange-800">
                    この操作を実行すると、最終バックアップ以降から現在までのデータが消失します。
                  </p>
                </div>
              </div>
            </div>

            {selectedBackupFile && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-1">復元するファイル:</p>
                <p className="font-medium">{selectedBackupFile}</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(false)}
                disabled={isRestoring}
              >
                取消
              </Button>
              <Button
                onClick={handleRestore}
                disabled={isRestoring}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRestoring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    復元中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    確認
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              ログアウトの確認
            </DialogTitle>
            <DialogDescription>
              ログアウトしますか？この操作により、現在のセッションが終了します。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                localStorage.removeItem('auth_user');
                localStorage.removeItem('admin_auth');
                localStorage.removeItem('cast_auth');
                setShowLogoutDialog(false);
                router.push('/login');
              }}
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}