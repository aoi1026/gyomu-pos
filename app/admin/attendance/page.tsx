'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, Clock, User, Calendar, Timer, MessageSquare, LogIn, LogOut, Search, Edit
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface Cast {
  id: number;
  name: string;
  mail: string;
}

interface AttendanceRecord {
  id: number;
  staff_id: number;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  total_work_hours: number | null;
  comment: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  status: string;
  created_at: string;
}

interface ActiveAttendance {
  id: number;
  staff_id: number;
  clock_in: string;
}

export default function AdminAttendancePage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [activeAttendances, setActiveAttendances] = useState<Map<number, ActiveAttendance>>(new Map());
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [selectedCast, setSelectedCast] = useState<Cast | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentValue, setCommentValue] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editHour, setEditHour] = useState<string>('');
  const [editMinute, setEditMinute] = useState<string>('');
  const [clockOutHour, setClockOutHour] = useState<string>('');
  const [clockOutMinute, setClockOutMinute] = useState<string>('');

  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    // 管理者認証情報を確認
    const adminAuth = localStorage.getItem('admin_auth');
    if (adminAuth) {
      try {
        const parsedAdminAuth = JSON.parse(adminAuth);
        setAdminUser(parsedAdminAuth);
        setIsLoading(false);
        loadCasts();
        loadActiveAttendances();
        loadAttendanceHistory();
      } catch (err) {
        console.error('管理者認証情報の解析に失敗しました:', err);
        localStorage.removeItem('admin_auth');
        router.push('/admin-login');
      }
    } else {
      router.push('/admin-login');
    }
  }, [router]);


  const loadCasts = async () => {
    try {
      const response = await fetch('/api/users?role=cast');
      const result = await response.json();
      if (result.success) {
        setCasts(result.data);
      } else {
        error('エラー', 'キャストデータの取得に失敗しました');
      }
    } catch (err) {
      console.error('キャストデータ取得エラー:', err);
      error('エラー', 'キャストデータの取得に失敗しました');
    }
  };

  const loadActiveAttendances = async () => {
    try {
      const response = await fetch('/api/attendance');
      const result = await response.json();
      if (result.success) {
        // clock_outがnullの最新レコードを取得
        const activeMap = new Map<number, ActiveAttendance>();
        result.data.forEach((record: any) => {
          if (!record.clock_out) {
            const existing = activeMap.get(record.staff_id);
            if (!existing || new Date(record.clock_in) > new Date(existing.clock_in)) {
              activeMap.set(record.staff_id, {
                id: record.id,
                staff_id: record.staff_id,
                clock_in: record.clock_in
              });
            }
          }
        });
        setActiveAttendances(activeMap);
      }
    } catch (err) {
      console.error('出勤データ取得エラー:', err);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      const response = await fetch('/api/attendance');
      const result = await response.json();
      if (result.success) {
        // statusが'saved'のレコードのみを取得（APIからapproved_by_nameも取得済み）
        const savedRecords = result.data.filter((r: any) => r.status === 'saved');

        // 作成日時で降順ソート
        savedRecords.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setAttendanceHistory(savedRecords);
      } else {
        error('エラー', '勤怠履歴の取得に失敗しました');
      }
    } catch (err) {
      console.error('勤怠履歴取得エラー:', err);
      error('エラー', '勤怠履歴の取得に失敗しました');
    }
  };

  const handleCastClick = (cast: Cast) => {
    const isActive = activeAttendances.has(cast.id);
    
    if (isActive) {
      // 出勤中の場合は退勤モーダルを表示
      setSelectedCast(cast);
      const now = new Date();
      setClockOutHour(String(now.getHours()).padStart(2, '0'));
      setClockOutMinute(String(now.getMinutes()).padStart(2, '0'));
      setCommentValue('');
      setIsModalOpen(true);
    } else {
      // 出勤していない場合は直接出勤処理を実行
      handleDirectClockIn(cast);
    }
  };

  const handleDirectClockIn = async (cast: Cast) => {
    setIsSubmitting(true);
    try {
      const now = new Date();
      const clockInTime = now.toISOString();
      
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: cast.id,
          clock_in: clockInTime
        })
      });

      const result = await response.json();
      if (result.success) {
        // 出勤状態を1に設定
        try {
          await fetch(`/api/casts/${cast.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendance_status: 1 })
          });
        } catch (err) {
          console.error('出勤状態更新エラー:', err);
        }
        
        success('出勤記録完了', `${cast.name}さんの出勤を記録しました`);
        loadActiveAttendances();
        loadAttendanceHistory();
      } else {
        error('エラー', result.error || '出勤記録に失敗しました');
      }
    } catch (err) {
      console.error('出勤記録エラー:', err);
      error('エラー', '出勤記録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockIn = async () => {
    // この関数は使用されなくなりました（直接出勤処理に置き換え）
  };

  const handleClockOut = async () => {
    if (!selectedCast || !clockOutHour || !clockOutMinute) {
      error('エラー', '時間を入力してください');
      return;
    }

    const activeAttendance = activeAttendances.get(selectedCast.id);
    if (!activeAttendance) {
      error('エラー', '出勤記録が見つかりません');
      return;
    }

    setIsSubmitting(true);
    try {
      // 現在の日付を取得
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      
      // 入力された時・分を使用
      const hour = parseInt(clockOutHour);
      const minute = parseInt(clockOutMinute);
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        error('エラー', '正しい時間を入力してください');
        setIsSubmitting(false);
        return;
      }

      const clockOutTimeStr = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      const clockOutTime = new Date(clockOutTimeStr).toISOString();
      const clockInTime = new Date(activeAttendance.clock_in);
      const diffMs = new Date(clockOutTime).getTime() - clockInTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const response = await fetch(`/api/attendance/${activeAttendance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clock_out: clockOutTime,
          total_work_hours: Math.round(diffHours * 100) / 100,
          comment: commentValue || null,
          status: 'saved',
          approved_by: adminUser.id
        })
      });

      const result = await response.json();
      if (result.success) {
        // 出勤状態を0に設定
        try {
          await fetch(`/api/casts/${selectedCast.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendance_status: 0 })
          });
        } catch (err) {
          console.error('出勤状態更新エラー:', err);
        }
        
        success('退勤記録完了', `${selectedCast.name}さんの退勤を記録しました`);
        setIsModalOpen(false);
        loadActiveAttendances();
        loadAttendanceHistory();
      } else {
        error('エラー', result.error || '退勤記録に失敗しました');
      }
    } catch (err) {
      console.error('退勤記録エラー:', err);
      error('エラー', '退勤記録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClockIn = (cast: Cast) => {
    const activeAttendance = activeAttendances.get(cast.id);
    if (!activeAttendance) return;

    const clockInDate = new Date(activeAttendance.clock_in);
    setEditHour(String(clockInDate.getHours()).padStart(2, '0'));
    setEditMinute(String(clockInDate.getMinutes()).padStart(2, '0'));
    setSelectedCast(cast);
    setIsEditModalOpen(true);
  };

  const handleSaveEditClockIn = async () => {
    if (!selectedCast || !editHour || !editMinute) {
      error('エラー', '時間を入力してください');
      return;
    }

    const activeAttendance = activeAttendances.get(selectedCast.id);
    if (!activeAttendance) {
      error('エラー', '出勤記録が見つかりません');
      return;
    }

    setIsSubmitting(true);
    try {
      const hour = parseInt(editHour);
      const minute = parseInt(editMinute);
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        error('エラー', '正しい時間を入力してください');
        setIsSubmitting(false);
        return;
      }

      // 既存の出勤時間から日付部分を取得
      const clockInDate = new Date(activeAttendance.clock_in);
      const year = clockInDate.getFullYear();
      const month = String(clockInDate.getMonth() + 1).padStart(2, '0');
      const day = String(clockInDate.getDate()).padStart(2, '0');
      
      const clockInTimeStr = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      const clockInTime = new Date(clockInTimeStr).toISOString();

      const response = await fetch(`/api/attendance/${activeAttendance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clock_in: clockInTime
        })
      });

      const result = await response.json();
      if (result.success) {
        success('出勤時間を更新しました', `${selectedCast.name}さんの出勤時間を更新しました`);
        setIsEditModalOpen(false);
        loadActiveAttendances();
        loadAttendanceHistory();
      } else {
        error('エラー', result.error || '出勤時間の更新に失敗しました');
      }
    } catch (err) {
      console.error('出勤時間更新エラー:', err);
      error('エラー', '出勤時間の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWorkHours = (hours: number | null) => {
    if (hours === null) return '-';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}時間${m}分`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminUser) return null;

  // フィルタリング適用
  const filteredCasts = casts.filter(cast => {
    const isActive = activeAttendances.has(cast.id);
    if (showActiveOnly && !isActive) return false;
    if (showInactiveOnly && isActive) return false;
    return true;
  });

  // キャストを5列のグリッドに配置
  const castRows: Cast[][] = [];
  for (let i = 0; i < filteredCasts.length; i += 5) {
    castRows.push(filteredCasts.slice(i, i + 5));
  }

  return (
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">出勤管理</h1>
                <p className="text-xs sm:text-sm text-gray-500">キャストの出勤・退勤記録</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="record">出勤・退勤記録</TabsTrigger>
            <TabsTrigger value="history">出勤・退勤履歴</TabsTrigger>
          </TabsList>

          {/* タブ1: 出勤・退勤記録 */}
          <TabsContent value="record">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    キャスト一覧
                  </CardTitle>
                  <div className="flex items-center space-x-4 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-active"
                        checked={showActiveOnly}
                        onCheckedChange={(checked) => {
                          setShowActiveOnly(checked as boolean);
                          if (checked) setShowInactiveOnly(false);
                        }}
                      />
                      <Label htmlFor="show-active" className="text-sm font-normal cursor-pointer whitespace-nowrap">
                        出勤中のみ
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-inactive"
                        checked={showInactiveOnly}
                        onCheckedChange={(checked) => {
                          setShowInactiveOnly(checked as boolean);
                          if (checked) setShowActiveOnly(false);
                        }}
                      />
                      <Label htmlFor="show-inactive" className="text-sm font-normal cursor-pointer whitespace-nowrap">
                        欠勤のみ
                      </Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredCasts.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {casts.length === 0 
                        ? 'キャストが登録されていません' 
                        : '該当するキャストがありません'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {castRows.map((row, rowIndex) => (
                      <div key={rowIndex} className="grid grid-cols-5 gap-4">
                        {row.map((cast) => {
                          const isActive = activeAttendances.has(cast.id);
                          const activeAttendance = isActive ? activeAttendances.get(cast.id) : null;
                          return (
                            <div key={cast.id} className="relative">
                              <Button
                                variant={isActive ? "default" : "outline"}
                                className={`h-24 w-full flex flex-col items-center justify-center ${
                                  isActive 
                                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                                    : 'bg-white hover:bg-gray-50'
                                }`}
                                onClick={() => handleCastClick(cast)}
                              >
                                <div className="font-medium text-sm sm:text-base">{cast.name}</div>
                                {isActive && activeAttendance && (
                                  <div className="mt-1 flex flex-col items-center">
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 mb-1">
                                      出勤中
                                    </Badge>
                                    <div className="text-xs opacity-90">
                                    出勤時間 {formatTime(activeAttendance.clock_in)}
                                    </div>
                                  </div>
                                )}
                              </Button>
                              {isActive && activeAttendance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-white hover:bg-gray-100 text-gray-600 rounded-full shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClockIn(cast);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {/* 空のセルを埋める */}
                        {Array.from({ length: 5 - row.length }).map((_, idx) => (
                          <div key={`empty-${idx}`} className="h-24" />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* タブ2: 出勤・退勤履歴 */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    出勤・退勤履歴
                  </CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="キャスト名で検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredHistory = attendanceHistory.filter(record =>
                    !searchQuery || record.staff_name.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  
                  return filteredHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchQuery ? '検索結果がありません' : '履歴がありません'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>キャスト名</TableHead>
                            <TableHead>出勤時間</TableHead>
                            <TableHead>退勤時間</TableHead>
                            <TableHead>担当管理者</TableHead>
                            <TableHead>備考</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.staff_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{formatDateTime(record.clock_in)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.clock_out ? (
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span>{formatDateTime(record.clock_out)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.approved_by_name || '-'}
                            </TableCell>
                            <TableCell>
                              {record.comment ? (
                                <div className="flex items-center space-x-2 max-w-xs">
                                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm truncate">{record.comment}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 出勤/退勤モーダル */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedCast && activeAttendances.has(selectedCast.id) ? (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  退勤記録
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  出勤記録
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedCast && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{selectedCast.name}</span>
                </div>
              </div>

              {activeAttendances.has(selectedCast.id) && (
                <div>
                  <Label>退勤時間</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center space-x-1">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={clockOutHour}
                        onChange={(e) => setClockOutHour(e.target.value)}
                        placeholder="時"
                        className="w-20"
                      />
                      <span className="text-gray-500">時</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={clockOutMinute}
                        onChange={(e) => setClockOutMinute(e.target.value)}
                        placeholder="分"
                        className="w-20"
                      />
                      <span className="text-gray-500">分</span>
                    </div>
                  </div>
                </div>
              )}

              {activeAttendances.has(selectedCast.id) && (
                <div>
                  <Label htmlFor="comment">備考（任意）</Label>
                  <Textarea
                    id="comment"
                    value={commentValue}
                    onChange={(e) => setCommentValue(e.target.value)}
                    rows={3}
                    className="mt-1"
                    placeholder="備考を入力してください"
                  />
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? (
                    '処理中...'
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      退勤
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 出勤時間編集モーダル */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              出勤時間の編集
            </DialogTitle>
          </DialogHeader>
          {selectedCast && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{selectedCast.name}</span>
                </div>
              </div>

              <div>
                <Label>出勤時間</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center space-x-1">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={editHour}
                      onChange={(e) => setEditHour(e.target.value)}
                      placeholder="時"
                      className="w-20"
                    />
                    <span className="text-gray-500">時</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={editMinute}
                      onChange={(e) => setEditMinute(e.target.value)}
                      placeholder="分"
                      className="w-20"
                    />
                    <span className="text-gray-500">分</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveEditClockIn}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    '処理中...'
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      保存
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
