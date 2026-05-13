'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, ExternalLink, Circle, Play, Edit2, Save, X } from 'lucide-react';
import TableViewer from './TableViewer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotificationContext } from '@/lib/notification-context';

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

interface RealTimeTableStatusProps {
  open: boolean;
  onClose: () => void;
}

export default function RealTimeTableStatus({ open, onClose }: RealTimeTableStatusProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [viewingTableId, setViewingTableId] = useState<number | null>(null);
  const [showStartSessionDialog, setShowStartSessionDialog] = useState(false);
  const [selectedTableForSession, setSelectedTableForSession] = useState<TableData | null>(null);
  const [guestCount, setGuestCount] = useState<string>('');
  const [sessionMemo, setSessionMemo] = useState<string>('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [remainingTimes, setRemainingTimes] = useState<{ [tableId: number]: number }>({});
  const [showRemainingTimeDialog, setShowRemainingTimeDialog] = useState(false);
  const [selectedSessionForTimeEdit, setSelectedSessionForTimeEdit] = useState<SessionData | null>(null);
  const [editingRemainingMinutes, setEditingRemainingMinutes] = useState<string>('');
  const [editingRemainingSeconds, setEditingRemainingSeconds] = useState<string>('');
  const { success, error } = useNotificationContext();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  // リアルタイム更新のためのポーリング
  useEffect(() => {
    if (!open) return;

    // 初回読み込み後、定期的にデータを更新
    const interval = setInterval(() => {
      fetchDataSilently();
    }, 200); // 0.2秒ごとに更新（即時反映のため）

    return () => clearInterval(interval);
  }, [open]);

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
        // 強制的にstateを更新（created_atの変更を確実に反映）
        // created_atなどのタイムスタンプの変更を検出するため、常に新しいデータで更新
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
    // Open table in embedded viewer
    setViewingTableId(tableId);
  };

  // 残り時間変更処理（停止中のみ）
  const handleChangeRemainingTime = async () => {
    if (!selectedSessionForTimeEdit || !selectedSessionForTimeEdit.is_paused) {
      error('エラー', '停止中のみ残り時間を変更できます');
      return;
    }

    const minutes = parseInt(editingRemainingMinutes) || 0;
    const seconds = parseInt(editingRemainingSeconds) || 0;
    const newRemainingSeconds = minutes * 60 + seconds;

    if (newRemainingSeconds < 0) {
      error('エラー', '残り時間は0以上である必要があります');
      return;
    }

    try {
      // 新しい残り時間から逆算してcreated_atを計算
      const setCount = selectedSessionForTimeEdit.set_count || 1;
      const setDuration = 3600; // 1セット = 3600秒
      const totalSeconds = setCount * setDuration;
      
      // 新しい残り時間から経過時間を計算
      const elapsed = totalSeconds - newRemainingSeconds;
      
      // 停止時間を考慮して新しいcreated_atを計算
      const pausedElapsed = selectedSessionForTimeEdit.paused_elapsed || 0;
      const pausedAt = selectedSessionForTimeEdit.paused_at ? new Date(selectedSessionForTimeEdit.paused_at).getTime() : Date.now();
      const currentPauseDuration = Math.floor((Date.now() - pausedAt) / 1000);
      const totalPausedTime = pausedElapsed + currentPauseDuration;
      
      // 新しいcreated_at = 現在時刻 - 経過時間 - 累積停止時間
      const newCreatedAt = new Date(Date.now() - (elapsed + totalPausedTime) * 1000).toISOString();

      const response = await fetch(`/api/sessions/${selectedSessionForTimeEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          created_at: newCreatedAt
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '残り時間の変更に失敗しました');
      }

      // 更新されたセッションデータを直接状態に反映（即座に表示を更新）
      if (result.data) {
        setSessions(prevSessions => {
          return prevSessions.map(s => 
            s.id === result.data.id ? { ...s, ...result.data } : s
          );
        });
      }

      // 即座にデータを再取得して反映（複数回呼び出して確実に更新）
      await fetchData();
      await fetchDataSilently();
      
      // 少し待ってから再度更新（確実に反映されるように）
      setTimeout(() => {
        fetchDataSilently();
      }, 300);
      
      setShowRemainingTimeDialog(false);
      setSelectedSessionForTimeEdit(null);
      setEditingRemainingMinutes('');
      setEditingRemainingSeconds('');
      success('残り時間変更', '残り時間を変更しました。テーブル側と管理者側の両方で即座に反映されます。');
    } catch (err) {
      console.error('残り時間変更エラー:', err);
      error('エラー', err instanceof Error ? err.message : '残り時間の変更に失敗しました');
    }
  };

  const handleOpenRemainingTimeDialog = (session: SessionData) => {
    if (!session.is_paused) {
      error('エラー', '停止中のみ残り時間を変更できます');
      return;
    }
    
    const remainingSeconds = calculateRemainingTime(session);
    setSelectedSessionForTimeEdit(session);
    setEditingRemainingMinutes(Math.floor(remainingSeconds / 60).toString());
    setEditingRemainingSeconds((remainingSeconds % 60).toString());
    setShowRemainingTimeDialog(true);
  };

  const handleCloseViewer = () => {
    setViewingTableId(null);
    // Refresh data when returning from viewer
    fetchData();
  };

  const handleStartSessionClick = (table: TableData) => {
    setSelectedTableForSession(table);
    setGuestCount('');
    setSessionMemo('');
    setShowStartSessionDialog(true);
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
        throw new Error(result.error || 'セッション作成に失敗しました');
      }

      // セッション作成時に既に停止状態で初期化されているため、追加の初期化は不要
      // （API側でis_paused: true, paused_at: 現在時刻, paused_elapsed: 0, set_extensions: []が設定済み）

      success('セッション開始', 'セッションを開始しました');
      
      // モーダルを閉じる
      setShowStartSessionDialog(false);
      const tableId = selectedTableForSession.id;
      setSelectedTableForSession(null);
      setGuestCount('');
      setSessionMemo('');
      
      // データを更新
      await fetchData();
      
      // TableViewerを開く（テーブル [id] - 管理者ビュー）
      setViewingTableId(tableId);
      
      // メインダイアログを閉じる
      onClose();
    } catch (err) {
      console.error('セッション開始エラー:', err);
      error('エラー', `セッション開始に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  // 終了時間を計算する関数（TableViewer セット延長欄の「終了」と同一式）
  const calculateEndTime = (session: SessionData): Date => {
    const sessionStart = new Date(session.created_at).getTime();
    const setCount = session.set_count || 1;
    const setDuration = 3600; // 1セット = 3600秒
    return new Date(sessionStart + setCount * setDuration * 1000);
  };

  const filteredTables = tables.filter(table => {
    const hasSession = getTableSession(table.id);
    if (activeTab === 'empty') {
      return !hasSession;
    } else if (activeTab === 'active') {
      return !!hasSession;
    }
    return true; // 'all'
  }).sort((a, b) => {
    const sessionA = getTableSession(a.id);
    const sessionB = getTableSession(b.id);
    
    // セッションがないテーブルは後ろに
    if (!sessionA && !sessionB) return 0;
    if (!sessionA) return 1;
    if (!sessionB) return -1;
    
    // 終了時間でソート（昇順）
    const endTimeA = calculateEndTime(sessionA).getTime();
    const endTimeB = calculateEndTime(sessionB).getTime();
    return endTimeA - endTimeB;
  });

  // 残り時間を計算する関数
  const calculateRemainingTime = (session: SessionData): number => {
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
      elapsed -= (pausedElapsed + currentPauseTime);
    } else {
      // 停止していない場合、累積停止時間のみを減算
      elapsed -= pausedElapsed;
    }
    
    return Math.max(0, totalSeconds - elapsed);
  };

  // 残り時間をリアルタイムで更新
  useEffect(() => {
    if (!open) return;

    const updateRemainingTimes = () => {
      const newRemainingTimes: { [tableId: number]: number } = {};
      sessions.forEach(session => {
        newRemainingTimes[session.table_id] = calculateRemainingTime(session);
      });
      setRemainingTimes(newRemainingTimes);
    };

    // 初回更新
    updateRemainingTimes();

    // sessionsが更新されたときは即座に再計算
    // また、0.2秒ごとに残り時間を更新（ポーリング間隔と同期）
    const interval = setInterval(updateRemainingTimes, 200);

    return () => clearInterval(interval);
  }, [open, sessions]);

  const renderTableCard = (table: TableData) => {
    const session = getTableSession(table.id);
    const isEmpty = !session;
    
    // 残り時間と終了時間を計算（リアルタイム更新された残り時間を使用）
    const remainingSeconds = session ? (remainingTimes[table.id] ?? calculateRemainingTime(session)) : 0;
    const endTime = session ? calculateEndTime(session) : null;
    const startTime = session ? new Date(session.created_at) : null;

    return (
      <Card 
        key={table.id} 
        className={`relative ${isEmpty ? 'bg-gray-50' : 'bg-blue-50 border-blue-300'}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">{table.name}</h3>
            {isEmpty ? (
              <Badge variant="secondary" className="bg-gray-300 text-gray-700">
                <Circle className="w-3 h-3 mr-1" />
                空席
              </Badge>
            ) : (
              <Badge className="bg-green-500 text-white">
                <Circle className="w-3 h-3 mr-1 fill-current" />
                セッション中
              </Badge>
            )}
          </div>

          {session ? (
            <div className="space-y-2 mt-3">
              <div className="flex items-center text-sm text-gray-700">
                <Users className="w-4 h-4 mr-2" />
                <span>顧客数: {session.client || 0}名</span>
              </div>
              {startTime && (
                <div className="text-xs text-gray-600">
                  <div>開始: {startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              )}
              {endTime && (
                <div className="text-xs text-gray-600">
                  <div>終了予定: {endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-700">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  残り時間: {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                  {session.is_paused && <span className="ml-1 text-orange-600 text-xs">(停止中)</span>}
                </span>
              </div>
              {session.memo && (
                <div className="flex text-xs text-gray-600 pt-1 border-t border-gray-200">
                  <div className="font-medium text-gray-700 mb-1">メモ:</div>
                  <div>{session.memo}</div>
                </div>
              )}
              <Button
                size="sm"
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleAccessTable(table.id)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                アクセス
              </Button>
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-center py-2 text-gray-400 text-sm">
                利用可能
              </div>
              <Button
                size="sm"
                className="w-full mt-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleStartSessionClick(table)}
              >
                <Play className="w-4 h-4 mr-2" />
                セッション開始
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={open && !viewingTableId} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">リアルタイムテーブル状態</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="empty">空テーブル</TabsTrigger>
              <TabsTrigger value="active">セッション中</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="all" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTables.map(renderTableCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="empty" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    空テーブルがありません
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTables.map(renderTableCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    アクティブなセッションがありません
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTables.map(renderTableCard)}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Embedded Table Viewer */}
      <TableViewer
        tableId={viewingTableId}
        onClose={handleCloseViewer}
        onSessionMovedToTable={(newId) => setViewingTableId(newId)}
      />

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
                disabled={isStartingSession || !guestCount || guestCount.trim() === ''}
                className="bg-green-600 hover:bg-green-700"
              >
                {isStartingSession ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    開始中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    セッション開始
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 残り時間変更モーダル */}
      <Dialog open={showRemainingTimeDialog} onOpenChange={setShowRemainingTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>残り時間変更</DialogTitle>
            <DialogDescription>
              停止中のみ残り時間を変更できます。変更後、「再開」ボタンを押すと、変更された時間から計測が開始されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>残り時間</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={editingRemainingMinutes}
                  onChange={(e) => setEditingRemainingMinutes(e.target.value)}
                  placeholder="分"
                  className="text-center"
                />
                <span className="text-lg font-bold">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={editingRemainingSeconds}
                  onChange={(e) => setEditingRemainingSeconds(e.target.value)}
                  placeholder="秒"
                  className="text-center"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRemainingTimeDialog(false);
                  setSelectedSessionForTimeEdit(null);
                  setEditingRemainingMinutes('');
                  setEditingRemainingSeconds('');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleChangeRemainingTime}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                変更
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

