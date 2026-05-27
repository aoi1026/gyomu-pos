'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Clock, ExternalLink, Circle, Play, LogOut } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';
import { NomihoudaiToggleRow } from '@/components/set-extension/NomihoudaiToggleRow';

interface TableData {
  id: number;
  name: string;
  capacity: number | null;
}

interface SessionData {
  id: number;
  table_id: number;
  client: number;
  set_count: number;
  status: number;
  created_at: string;
  is_paused?: boolean;
  paused_at?: string;
  paused_elapsed?: number;
  memo?: string;
}

export default function TableListPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [tableUser, setTableUser] = useState<any>(null);
  const [showStartSessionDialog, setShowStartSessionDialog] = useState(false);
  const [selectedTableForSession, setSelectedTableForSession] = useState<TableData | null>(null);
  const [guestCount, setGuestCount] = useState<string>('');
  const [sessionMemo, setSessionMemo] = useState<string>('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startNomihoudaiEnabled, setStartNomihoudaiEnabled] = useState(false);
  const [startNomihoudaiUnit, setStartNomihoudaiUnit] = useState(0);
  const [remainingTimes, setRemainingTimes] = useState<{ [tableId: number]: number }>({});
  const [elapsedTimes, setElapsedTimes] = useState<{ [tableId: number]: number }>({});
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { success, error } = useNotificationContext();

  useEffect(() => {
    // テーブル管理ユーザーの認証情報を確認
    const tableAuth = localStorage.getItem('table_auth');
    if (tableAuth) {
      try {
        const parsedAuth = JSON.parse(tableAuth);
        // tableロールのユーザー、またはテーブルページから遷移したTableAuth形式の場合に許可
        if (parsedAuth.role === 'table' || parsedAuth.table_id) {
          setTableUser(parsedAuth);
          fetchData();
        } else {
          // 認証形式でない場合は削除
          localStorage.removeItem('table_auth');
          router.push('/table-login');
        }
      } catch (err) {
        console.error('認証情報の解析に失敗しました:', err);
        localStorage.removeItem('table_auth');
        router.push('/table-login');
      }
    } else {
      router.push('/table-login');
    }
  }, [router]);

  // リアルタイム更新のためのポーリング（セッションデータ）
  useEffect(() => {
    if (!tableUser) return;

    // 初回読み込み後、定期的にデータを更新
    const interval = setInterval(() => {
      fetchDataSilently();
    }, 200); // 0.2秒ごとに更新（即時反映のため）

    return () => clearInterval(interval);
  }, [tableUser]);

  // 経過時間と残り時間をリアルタイムで更新（1秒ごと）
  useEffect(() => {
    if (!tableUser || sessions.length === 0) {
      setElapsedTimes({});
      setRemainingTimes({});
      return;
    }

    const updateTimes = () => {
      const newRemainingTimes: { [tableId: number]: number } = {};
      const newElapsedTimes: { [tableId: number]: number } = {};

      sessions.forEach(session => {
        // 各セッションごとに独立して計算（ローカルストレージに依存しない）
        const setCount = session.set_count || 1;
        const setDuration = 3600; // 1セット = 3600秒
        const totalSeconds = setCount * setDuration;
        
        // セッション開始時刻から経過時間を計算
        const sessionStart = new Date(session.created_at).getTime();
        const now = Date.now();
        let elapsed = Math.floor((now - sessionStart) / 1000);
        
        // 停止時間を考慮
        const pausedElapsed = session.paused_elapsed || 0;
        if (session.is_paused && session.paused_at) {
          // 現在停止中の場合、停止開始時刻からの経過時間を累積停止時間に追加
          const pausedAt = new Date(session.paused_at).getTime();
          const currentPauseTime = Math.floor((now - pausedAt) / 1000);
          // 停止中は経過時間から累積停止時間と現在の停止時間を減算（タイマーは進まない）
          elapsed -= (pausedElapsed + currentPauseTime);
        } else {
          // 停止していない場合、累積停止時間のみを減算
          elapsed -= pausedElapsed;
        }
        
        // 経過時間は総時間を超えない
        elapsed = Math.min(elapsed, totalSeconds);
        const remaining = Math.max(0, totalSeconds - elapsed);
        
        newElapsedTimes[session.table_id] = elapsed;
        newRemainingTimes[session.table_id] = remaining;
      });

      setElapsedTimes(newElapsedTimes);
      setRemainingTimes(newRemainingTimes);
    };

    // 初回更新
    updateTimes();

    // 1秒ごとに更新
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, [sessions, tableUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tables
      const tablesRes = await fetch('/api/tables');
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData.tables || []);
      }

      // Fetch active sessions (status=1)
      const sessionsRes = await fetch('/api/sessions');
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.data?.filter((s: SessionData) => s.status === 1) || []);
      }
    } catch (error) {
      console.error('テーブル状態の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 静かな更新（ローディング表示なし）
  const fetchDataSilently = async () => {
    try {
      // Fetch tables
      const tablesRes = await fetch('/api/tables');
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData.tables || []);
      }

      // Fetch active sessions (status=1)
      const sessionsRes = await fetch('/api/sessions');
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        const newSessions = sessionsData.data?.filter((s: SessionData) => s.status === 1) || [];
        setSessions(newSessions);
      }
    } catch (error) {
      console.error('テーブル状態の取得エラー（静かな更新）:', error);
    }
  };

  const getTableSession = (tableId: number) => {
    return sessions.find(s => s.table_id === tableId);
  };

  const handleAccessTable = (tableId: number) => {
    const session = getTableSession(tableId);
    
    // 他のテーブルの状態に影響を与えないよう、グローバルなローカルストレージをクリア
    if (typeof window !== 'undefined') {
      // 前のテーブルのセッション関連データをクリア
      localStorage.removeItem('current_session_id');
      localStorage.removeItem('guest_count');
      localStorage.removeItem('set_count');
      localStorage.removeItem('set_extensions');
      localStorage.removeItem('set_extension_start_time');
      localStorage.removeItem('set_extension_total_seconds');
      localStorage.removeItem('nomination_charges');
      localStorage.removeItem('additional_services');
      localStorage.removeItem('payment_completed');
      localStorage.removeItem('paid_amount');
      localStorage.removeItem('cost');
      localStorage.removeItem('fullcost');
      localStorage.removeItem('nomination_type');
      localStorage.removeItem('service_orders');
      localStorage.removeItem('cart_orders');
      
      // セッションIDベースのキーもクリア（すべてのセッションIDのキーをクリア）
      // 注意: 完全にクリアするには、すべてのキーを列挙する必要がありますが、
      // ここでは主要なものをクリアします
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cart_orders_') || key.startsWith('service_orders_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    if (session) {
      // セッションが存在する場合、直接テーブル管理ページにリダイレクト
      router.push(`/table/${tableId}`);
    } else {
      // セッションが存在しない場合、人員入力モーダルを表示
      const table = tables.find(t => t.id === tableId);
      if (table) {
        setSelectedTableForSession(table);
        setGuestCount('');
        setSessionMemo('');
        setStartNomihoudaiEnabled(false);
        setStartNomihoudaiUnit(0);
        // 単価を取得（表示用）
        void (async () => {
          try {
            const res = await fetch('/api/add-charges');
            const j = await res.json().catch(() => ({}));
            const unit = Array.isArray(j?.charges)
              ? Number((j.charges.find((c: any) => String(c.charge_name) === 'nomihoudai')?.value) ?? 0)
              : 0;
            setStartNomihoudaiUnit(Number.isFinite(unit) ? unit : 0);
          } catch {
            setStartNomihoudaiUnit(0);
          }
        })();
        setShowStartSessionDialog(true);
      }
    }
  };

  const handleStartSession = async () => {
    if (!selectedTableForSession || !guestCount || guestCount.trim() === '') {
      error('エラー', '人数を入力してください');
      return;
    }
    
    // 人数がテーブルの定員を超えていないかチェック
    const numGuestCount = parseInt(guestCount);
    if (isNaN(numGuestCount) || numGuestCount <= 0) {
      error('エラー', '有効な人数を入力してください');
      return;
    }

    setIsStartingSession(true);
    
    try {
      // データベースにセッションを作成 (status=1, client=人数)
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: selectedTableForSession.id,
          cost: 0,
          client: numGuestCount,
          status: 1,
          memo: sessionMemo || null
        }),
      });

      const result = await response.json();

      if (!result.success) {
        error('エラー', result.error || 'セッション作成に失敗しました');
        return;
      }

      // 初回セットから飲み放題を適用する場合は additional_services に登録
      if (startNomihoudaiEnabled) {
        try {
          const nomiUnit = Number(startNomihoudaiUnit) || 0;
          if (nomiUnit > 0) {
            await fetch('/api/additional-services', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: result.data.id,
                type: 'nomihoudai',
                count: 1,
                charge: nomiUnit * numGuestCount,
                note: '初回セット',
              }),
            });
          }
        } catch (e) {
          console.error('飲み放題登録エラー:', e);
        }
      }

      success('セッション開始', 'セッションを開始しました');
      
      // モーダルを閉じる
      setShowStartSessionDialog(false);
      const tableId = selectedTableForSession.id;
      setSelectedTableForSession(null);
      setGuestCount('');
      setSessionMemo('');
      setStartNomihoudaiEnabled(false);
      
      // データを更新
      await fetchData();
      
      // 他のテーブルの状態に影響を与えないよう、グローバルなローカルストレージをクリア
      if (typeof window !== 'undefined') {
        // 前のテーブルのセッション関連データをクリア
        localStorage.removeItem('current_session_id');
        localStorage.removeItem('guest_count');
        localStorage.removeItem('set_count');
        localStorage.removeItem('set_extensions');
        localStorage.removeItem('set_extension_start_time');
        localStorage.removeItem('set_extension_total_seconds');
        localStorage.removeItem('nomination_charges');
        localStorage.removeItem('additional_services');
        localStorage.removeItem('payment_completed');
        localStorage.removeItem('paid_amount');
        localStorage.removeItem('cost');
        localStorage.removeItem('fullcost');
        localStorage.removeItem('nomination_type');
        localStorage.removeItem('service_orders');
        localStorage.removeItem('cart_orders');
        
        // セッションIDベースのキーもクリア
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cart_orders_') || key.startsWith('service_orders_')) {
            localStorage.removeItem(key);
          }
        });
        
        // 新しいセッションのデータを設定
        localStorage.setItem('current_session_id', result.data.id.toString());
        localStorage.setItem('guest_count', numGuestCount.toString());
        localStorage.setItem('set_count', '1');
      }
      
      // テーブル管理ページにリダイレクト
      router.push(`/table/${tableId}`);
    } catch (err) {
      console.error('セッション開始エラー:', err);
      error('エラー', `セッション開始に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateElapsedTime = (createdAt: string, setCount: number, isPaused?: boolean, pausedElapsed?: number) => {
    if (isPaused && pausedElapsed !== undefined) {
      return pausedElapsed;
    }
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const elapsed = Math.floor((now - created) / 1000);
    const setDuration = 3600; // 1セット = 3600秒
    const totalSeconds = setCount * setDuration;
    return Math.min(elapsed, totalSeconds);
  };

  const calculateRemainingTime = (createdAt: string, setCount: number, isPaused?: boolean, pausedElapsed?: number) => {
    const elapsed = calculateElapsedTime(createdAt, setCount, isPaused, pausedElapsed);
    const setDuration = 3600; // 1セット = 3600秒
    const totalSeconds = setCount * setDuration;
    return Math.max(0, totalSeconds - elapsed);
  };

  const calculateEndTime = (session: SessionData): number => {
    const setCount = session.set_count || 1;
    const setDuration = 3600; // 1セット = 3600秒
    const totalSeconds = setCount * setDuration;
    const sessionStart = new Date(session.created_at).getTime();
    const pausedElapsed = session.paused_elapsed || 0;
    // 終了時間 = 開始時間 + 総時間 + 累積停止時間
    return sessionStart + (totalSeconds + pausedElapsed) * 1000;
  };

  const getFilteredTables = () => {
    let filtered: TableData[] = [];
    if (activeTab === 'all') {
      filtered = tables;
    } else if (activeTab === 'occupied') {
      filtered = tables.filter(table => getTableSession(table.id));
    } else if (activeTab === 'available') {
      filtered = tables.filter(table => !getTableSession(table.id));
    } else {
      filtered = tables;
    }
    
    // セッションがあるテーブルを終了時間の昇順でソート
    return filtered.sort((a, b) => {
      const sessionA = getTableSession(a.id);
      const sessionB = getTableSession(b.id);
      
      // セッションがないテーブルは後ろに
      if (!sessionA && !sessionB) return 0;
      if (!sessionA) return 1;
      if (!sessionB) return -1;
      
      // 終了時間でソート（昇順）
      const endTimeA = calculateEndTime(sessionA);
      const endTimeB = calculateEndTime(sessionB);
      return endTimeA - endTimeB;
    });
  };

  const renderTableCard = (table: TableData) => {
    const session = getTableSession(table.id);
    const isEmpty = !session;

    if (session) {
      // リアルタイム更新された時間を使用（なければ計算）
      const elapsed = elapsedTimes[session.table_id] ?? calculateElapsedTime(session.created_at, session.set_count, session.is_paused, session.paused_elapsed);
      const remaining = remainingTimes[session.table_id] ?? calculateRemainingTime(session.created_at, session.set_count, session.is_paused, session.paused_elapsed);
      const elapsedFormatted = formatElapsedTime(elapsed);
      const remainingFormatted = formatElapsedTime(remaining);
      const isTimeExpired = remaining <= 0;
      const isPaused = session.is_paused || false;

      return (
        <Card key={table.id} className={`flex flex-col h-full rounded-none ${isTimeExpired ? 'border-red-300 bg-red-50' : isPaused ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'}`}>
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{table.name}</h3>
                <p className="text-sm text-gray-600">
                  収容人数: {table.capacity != null ? `${table.capacity}名` : '未設定'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {isTimeExpired ? (
                  <Badge variant="destructive">時間切れ</Badge>
                ) : isPaused ? (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">停止中</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">利用中</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-3 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">顧客数:</span>
                <span className="font-medium">{session.client}名</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">開始:</span>
                <span className="font-medium">{new Date(session.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">終了予定:</span>
                <span className="font-medium">
                  {(() => {
                    const setCount = session.set_count || 1;
                    const setDuration = 3600; // 1セット = 3600秒
                    const totalSeconds = setCount * setDuration;
                    const endTime = new Date(new Date(session.created_at).getTime() + totalSeconds * 1000);
                    return endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">残り時間:</span>
                <span className={`font-medium ${isTimeExpired ? 'text-red-600' : ''}`}>
                  {isTimeExpired ? '00:00:00' : remainingFormatted}
                </span>
              </div>
              {session.memo && (
                <div className="flex items-start justify-between text-sm pt-1 border-t border-gray-200">
                  <span className="text-gray-600">メモ:</span>
                  <span className="font-medium text-right flex-1 ml-2">{session.memo}</span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleAccessTable(table.id)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              アクセス
            </Button>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <Card key={table.id} className="flex flex-col h-full border-gray-200 rounded-none">
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{table.name}</h3>
                <p className="text-sm text-gray-600">
                  収容人数: {table.capacity != null ? `${table.capacity}名` : '未設定'}
                </p>
              </div>
              <Badge variant="outline" className="bg-gray-100 text-gray-800">利用可能</Badge>
            </div>

            <div className="space-y-2 mt-3 flex-1">
              <div className="flex items-center justify-center py-2 text-gray-400 text-sm">
                利用可能
              </div>
            </div>

            <Button
              size="sm"
              className="w-full mt-3 bg-green-600 hover:bg-green-700"
              onClick={() => handleAccessTable(table.id)}
            >
              <Play className="w-4 h-4 mr-2" />
              アクセス
            </Button>
          </CardContent>
        </Card>
      );
    }
  };

  if (!tableUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">テーブル管理</h1>
              {tableUser && (
                <Badge variant="outline" className="text-sm">
                  {tableUser.name}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>ログアウト</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="occupied">利用中</TabsTrigger>
            <TabsTrigger value="available">利用可能</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
                {getFilteredTables().map(table => renderTableCard(table))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* セッション開始モーダル */}
      <Dialog open={showStartSessionDialog} onOpenChange={setShowStartSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>セッション開始</DialogTitle>
            <DialogDescription>
              {selectedTableForSession?.name}でセッションを開始します。人数を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-count">人数</Label>
              <Input
                id="guest-count"
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="人数を入力"
                disabled={isStartingSession}
              />
              {selectedTableForSession?.capacity != null && (
                <p className="text-sm text-gray-500">
                  参考定員: {selectedTableForSession.capacity}名
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-memo">メモ</Label>
              <Input
                id="session-memo"
                type="text"
                value={sessionMemo}
                onChange={(e) => setSessionMemo(e.target.value)}
                placeholder="メモを入力（任意）"
                disabled={isStartingSession}
              />
            </div>
            <div className="space-y-2">
              <Label>飲み放題（初回セットから）</Label>
              <NomihoudaiToggleRow
                pricePerGuest={startNomihoudaiUnit}
                enabled={startNomihoudaiEnabled}
                onToggle={() => setStartNomihoudaiEnabled((v) => !v)}
                disabled={isStartingSession}
              />
              <p className="text-xs text-gray-500">単価は「料金設定 &gt; 飲み放題」から設定します</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStartSessionDialog(false);
                  setSelectedTableForSession(null);
                  setGuestCount('');
                  setSessionMemo('');
                }}
                disabled={isStartingSession}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleStartSession}
                disabled={!guestCount || guestCount.trim() === '' || isStartingSession}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isStartingSession ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>開始中...</span>
                  </div>
                ) : (
                  'セッション開始'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ログアウト確認モーダル */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-600">
              ログアウトの確認
            </DialogTitle>
            <DialogDescription>
              ログアウトしますか？現在のテーブルアカウントのセッションが終了します。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                localStorage.removeItem('table_auth');
                setShowLogoutDialog(false);
                router.push('/table-login');
              }}
            >
              ログアウト
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
