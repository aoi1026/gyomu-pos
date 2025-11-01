'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Clock, CheckCircle, XCircle, Eye, 
  Save, User, Mail, Calendar, Timer, MessageSquare, Clock3
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface AttendanceData {
  id: number;
  staff_id: number;
  staff_name: string;
  staff_email: string;
  clock_in: string;
  clock_out: string | null;
  total_work_hours: number;
  comment: string | null;
  detailed_times: any;
  status: string;
  created_at: string;
}

export default function AdminAttendancePage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceData | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isTimeDetailDialogOpen, setIsTimeDetailDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editForm, setEditForm] = useState({
    total_work_hours: '',
    comment: '',
    status: 'pending'
  });

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
        fetchAttendanceData();
        return;
      } catch (err) {
        console.error('管理者認証情報の解析に失敗しました:', err);
        localStorage.removeItem('admin_auth');
      }
    }
    
    // 管理者認証情報がない場合はログインページにリダイレクト
    router.push('/login');
  }, [router]);

  const fetchAttendanceData = async () => {
    try {
      const response = await fetch('/api/attendance');
      const result = await response.json();
      if (result.success) {
        setAttendanceData(result.data);
      } else {
        error('エラー', '勤怠データの取得に失敗しました');
      }
    } catch (err) {
      console.error('勤怠データ取得エラー:', err);
      error('エラー', '勤怠データの取得に失敗しました');
    }
  };

  const handleViewDetails = (attendance: AttendanceData) => {
    setSelectedAttendance(attendance);
    setEditForm({
      total_work_hours: attendance.total_work_hours?.toString() || '',
      comment: attendance.comment || '',
      status: attendance.status
    });
    setIsDetailDialogOpen(true);
  };

  const handleViewTimeDetails = (attendance: AttendanceData) => {
    setSelectedAttendance(attendance);
    setIsTimeDetailDialogOpen(true);
  };

  const handleQuickApprove = async (attendance: AttendanceData) => {
    if (attendance.status === 'saved') return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/attendance/${attendance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_work_hours: attendance.total_work_hours,
          comment: attendance.comment,
          status: 'saved',
          approved_by: adminUser.id
        })
      });

      const result = await response.json();
      if (result.success) {
        success('保存完了', '勤怠データが正常に保存されました');
        fetchAttendanceData();
      } else {
        error('エラー', result.error || '勤怠データの保存に失敗しました');
      }
    } catch (err) {
      console.error('勤怠データ保存エラー:', err);
      error('エラー', '勤怠データの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveApproval = async () => {
    if (!selectedAttendance) return;

    const totalHours = parseFloat(editForm.total_work_hours);
    if (isNaN(totalHours) || totalHours < 0) {
      error('エラー', '勤務時間は0以上の数値を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/attendance/${selectedAttendance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_work_hours: totalHours,
          comment: editForm.comment,
          status: editForm.status === 'approved' ? 'saved' : editForm.status,
          approved_by: adminUser.id
        })
      });

      const result = await response.json();
      if (result.success) {
        if (editForm.status === 'approved') {
          success('保存完了', '勤怠データが正常に保存されました');
        } else {
          success('更新完了', '勤怠データが正常に更新されました');
        }
        setIsDetailDialogOpen(false);
        fetchAttendanceData();
      } else {
        error('エラー', result.error || '勤怠データの保存に失敗しました');
      }
    } catch (err) {
      console.error('勤怠データ保存エラー:', err);
      error('エラー', '勤怠データの保存に失敗しました');
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
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}時間${m}分`;
  };

  // 詳細時間記録から総勤務時間を計算
  const calculateTotalWorkHours = (detailedTimes: any[]) => {
    if (!detailedTimes || detailedTimes.length === 0) return 0;
    
    const totalSeconds = detailedTimes.reduce((sum, record) => {
      return sum + (record.duration || 0);
    }, 0);
    
    return totalSeconds / 3600; // 秒を時間に変換
  };

  // 最後の記録の終了時間を取得
  const getLastRecordEndTime = (detailedTimes: any[]) => {
    if (!detailedTimes || detailedTimes.length === 0) return null;
    
    // 終了時間がある記録の中で最後のものを取得
    const completedRecords = detailedTimes.filter(record => record.endTime);
    if (completedRecords.length === 0) return null;
    
    // 開始時間でソートして最後の記録を取得
    const sortedRecords = completedRecords.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    return sortedRecords[sortedRecords.length - 1].endTime;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">承認済み</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">却下</Badge>;
      case 'saved':
        return <Badge className="bg-blue-100 text-blue-800">保存済み</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">承認待ち</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminUser) return null;

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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">勤怠承認</h1>
                <p className="text-xs sm:text-sm text-gray-500">キャストの勤怠データ承認</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 説明カード */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-800">
              <Clock className="w-5 h-5 mr-2" />
              勤怠承認管理
            </CardTitle>
            <CardDescription>
              キャストから送信された勤怠データを確認し、承認または却下を行います。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>承認済み</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>却下</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span>承認待ち</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 勤怠データ一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                勤怠データ一覧
              </span>
              <Badge variant="outline" className="text-sm">
                {attendanceData.length}件
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceData.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">勤怠データがありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">番号</TableHead>
                      <TableHead>キャスト名</TableHead>
                      <TableHead>出勤時間</TableHead>
                      <TableHead>退勤時間</TableHead>
                      <TableHead>勤務時間</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.map((attendance, index) => (
                      <TableRow key={attendance.id}>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-gray-600">
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900">{attendance.staff_name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {attendance.staff_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{formatDateTime(attendance.clock_in)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const lastEndTime = getLastRecordEndTime(attendance.detailed_times);
                            return lastEndTime ? (
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{formatDateTime(lastEndTime)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Timer className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {(() => {
                                const calculatedHours = calculateTotalWorkHours(attendance.detailed_times);
                                return calculatedHours > 0 ? 
                                  `${Math.floor(calculatedHours)}時間${Math.floor((calculatedHours % 1) * 60)}分${Math.floor(((calculatedHours % 1) * 60 % 1) * 60)}秒` : 
                                  '未計算';
                              })()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(attendance.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                              {/* <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleViewDetails(attendance)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                詳細
                              </Button> */}
                              {attendance.detailed_times && attendance.detailed_times.length > 0 && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleViewTimeDetails(attendance)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                                >
                                  <Clock className="w-4 h-4 mr-1" />
                                  時間詳細
                                </Button>
                              )}
                              <Button 
                              size="sm" 
                              variant={attendance.status === 'saved' ? 'outline' : 'default'}
                              onClick={() => handleQuickApprove(attendance)}
                              disabled={attendance.status === 'saved'}
                              className={attendance.status === 'saved' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              {attendance.status === 'saved' ? '保存済み' : '承認・保存'}
                            </Button>
                            </div>
                            
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 詳細・承認ダイアログ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              勤怠詳細・承認
            </DialogTitle>
          </DialogHeader>
          {selectedAttendance && (
            <div className="space-y-6">
              {/* キャスト情報 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">キャスト情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedAttendance.staff_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedAttendance.staff_email}</span>
                  </div>
                </div>
              </div>

              {/* 勤務時間情報 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="total-hours">勤務時間（時間）</Label>
                  <Input
                    id="total-hours"
                    type="number"
                    step="0.1"
                    value={editForm.total_work_hours}
                    onChange={(e) => setEditForm(prev => ({ ...prev, total_work_hours: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="comment">コメント</Label>
                  <Textarea
                    id="comment"
                    value={editForm.comment}
                    onChange={(e) => setEditForm(prev => ({ ...prev, comment: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="status">ステータス</Label>
                  <select
                    id="status"
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="pending">承認待ち</option>
                    <option value="approved">承認</option>
                    <option value="rejected">却下</option>
                    <option value="saved">保存済み</option>
                  </select>
                </div>
              </div>

              {/* 詳細時間記録 */}
              {selectedAttendance.detailed_times && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Clock3 className="w-4 h-4 mr-2" />
                    詳細時間記録
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedAttendance.detailed_times.map((record: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDateTime(record.startTime)}
                          </div>
                          {record.endTime && (
                            <div className="text-xs text-gray-500 mt-1">
                              ～ {formatDateTime(record.endTime)}
                            </div>
                          )}
                          {!record.endTime && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              進行中
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-bold text-blue-600 ml-4">
                          {Math.floor(record.duration / 3600)}時間{Math.floor((record.duration % 3600) / 60)}分{record.duration % 60}秒
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button 
                  onClick={handleSaveApproval} 
                  disabled={isSubmitting || editForm.status === 'saved'}
                  className={editForm.status === 'saved' ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? '保存中...' : (editForm.status === 'saved' ? '保存済み' : '承認・保存')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 詳細時間表示ダイアログ */}
      <Dialog open={isTimeDetailDialogOpen} onOpenChange={setIsTimeDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              詳細時間記録
            </DialogTitle>
          </DialogHeader>
          {selectedAttendance && (
            <div className="space-y-6">
              {/* キャスト情報 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  キャスト情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{selectedAttendance.staff_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedAttendance.staff_email}</span>
                  </div>
                </div>
              </div>

              {/* 勤務時間サマリー */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Timer className="w-4 h-4 mr-2" />
                  勤務時間サマリー
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const calculatedHours = calculateTotalWorkHours(selectedAttendance.detailed_times);
                        return calculatedHours > 0 ? 
                          `${Math.floor(calculatedHours)}時間${Math.floor((calculatedHours % 1) * 60)}分${Math.floor(((calculatedHours % 1) * 60 % 1) * 60)}秒` : 
                          '未計算';
                      })()}
                    </div>
                    <div className="text-sm text-gray-600">総勤務時間</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-800">
                      {formatDateTime(selectedAttendance.clock_in)}
                    </div>
                    <div className="text-sm text-gray-600">出勤時間</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-800">
                      {(() => {
                        const lastEndTime = getLastRecordEndTime(selectedAttendance.detailed_times);
                        return lastEndTime ? formatDateTime(lastEndTime) : '未退勤';
                      })()}
                    </div>
                    <div className="text-sm text-gray-600">退勤時間</div>
                  </div>
                </div>
              </div>

              {/* 詳細時間記録 */}
              {selectedAttendance.detailed_times && selectedAttendance.detailed_times.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    詳細時間記録
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedAttendance.detailed_times.map((record: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDateTime(record.startTime)}
                          </div>
                          {record.endTime && (
                            <div className="text-xs text-gray-500 mt-1">
                              ～ {formatDateTime(record.endTime)}
                            </div>
                          )}
                          {!record.endTime && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              進行中
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-bold text-blue-600 ml-4">
                          {Math.floor(record.duration / 3600)}時間{Math.floor((record.duration % 3600) / 60)}分{record.duration % 60}秒
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* コメント */}
              {selectedAttendance.comment && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    コメント
                  </h3>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedAttendance.comment}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsTimeDetailDialogOpen(false)}>
                  閉じる
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
