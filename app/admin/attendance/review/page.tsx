'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, User, Edit, Save, X
} from 'lucide-react';
import { 
  mockAttendance, mockStaff, formatDateTime, calculateWorkingHours,
  Attendance
} from '@/lib/mock-data';

export default function AttendanceReviewPage() {
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2025-01-20');
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    loadAttendanceData(selectedDate);
  }, [selectedDate]);

  const loadAttendanceData = async (date: string) => {
    setIsLoading(true);
    
    // 指定日の勤怠データを読み込み
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // モックデータをフィルタリング（実際はAPIから取得）
    const dateAttendance = mockAttendance.filter(a => 
      a.clock_in.startsWith(date)
    );
    
    setAttendanceList(dateAttendance);
    setIsLoading(false);
  };

  const getStaffName = (staffId: string) => {
    const staff = mockStaff.find(s => s.id === staffId);
    return staff?.name || '不明';
  };

  const getStaffRank = (staffId: string) => {
    const staff = mockStaff.find(s => s.id === staffId);
    return staff?.rank || '不明';
  };

  const startEdit = (attendance: Attendance) => {
    setEditingAttendance({ ...attendance });
    setReviewNote('');
  };

  const saveEdit = () => {
    if (!editingAttendance) return;
    
    setAttendanceList(attendanceList.map(a => 
      a.id === editingAttendance.id ? editingAttendance : a
    ));
    setEditingAttendance(null);
    
    console.log('勤怠修正:', editingAttendance);
  };

  const approveAttendance = (attendanceId: string) => {
    setAttendanceList(attendanceList.map(a => 
      a.id === attendanceId 
        ? { ...a, status: 'approved' }
        : a
    ));
    
    console.log('勤怠承認:', attendanceId);
  };

  const rejectAttendance = (attendanceId: string) => {
    const note = prompt('却下理由を入力してください:');
    if (!note) return;
    
    setAttendanceList(attendanceList.map(a => 
      a.id === attendanceId 
        ? { ...a, status: 'pending', note: `${a.note || ''}\n[却下理由] ${note}` }
        : a
    ));
    
    console.log('勤怠却下:', attendanceId, note);
  };

  const reverseApproval = (attendanceId: string) => {
    if (!confirm('承認を取り消しますか？')) return;
    
    setAttendanceList(attendanceList.map(a => 
      a.id === attendanceId 
        ? { ...a, status: 'pending' }
        : a
    ));
    
    console.log('勤怠承認取り消し:', attendanceId);
  };

  const bulkApprove = () => {
    if (!confirm('承認待ちの勤怠を一括承認しますか？')) return;
    
    setAttendanceList(attendanceList.map(a => 
      a.status === 'pending' 
        ? { ...a, status: 'approved' }
        : a
    ));
    
    console.log('一括承認実行');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'locked':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '承認待ち';
      case 'approved':
        return '承認済';
      case 'locked':
        return 'ロック済';
      default:
        return '不明';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingCount = attendanceList.filter(a => a.status === 'pending').length;

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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">勤怠承認</h1>
                  <p className="text-xs sm:text-sm text-gray-500">スタッフ勤怠の確認・承認・修正</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    承認待ち {pendingCount}件
                  </Badge>
                )}
                <Button 
                  onClick={bulkApprove}
                  disabled={pendingCount === 0}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  一括承認
                </Button>
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
              </div>
            </CardContent>
          </Card>

          {/* 勤怠一覧 */}
          <div className="space-y-6">
            {attendanceList.map((attendance) => {
              const workingHours = calculateWorkingHours(
                attendance.clock_in, 
                attendance.clock_out, 
                attendance.break_minutes
              );
              
              return (
                <Card key={attendance.id} className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    {editingAttendance?.id === attendance.id ? (
                      // 編集モード
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold">{getStaffName(attendance.staff_id)}</h3>
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={saveEdit}>
                              <Save className="w-4 h-4 mr-1" />
                              保存
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingAttendance(null)}>
                              <X className="w-4 h-4 mr-1" />
                              キャンセル
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="clock-in">出勤時刻</Label>
                            <Input
                              id="clock-in"
                              type="datetime-local"
                              value={editingAttendance.clock_in.slice(0, 16)}
                              onChange={(e) => setEditingAttendance({
                                ...editingAttendance,
                                clock_in: e.target.value + ':00Z'
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="clock-out">退勤時刻</Label>
                            <Input
                              id="clock-out"
                              type="datetime-local"
                              value={editingAttendance.clock_out?.slice(0, 16) || ''}
                              onChange={(e) => setEditingAttendance({
                                ...editingAttendance,
                                clock_out: e.target.value ? e.target.value + ':00Z' : undefined
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="break-minutes">休憩時間（分）</Label>
                            <Input
                              id="break-minutes"
                              type="number"
                              min="0"
                              value={editingAttendance.break_minutes}
                              onChange={(e) => setEditingAttendance({
                                ...editingAttendance,
                                break_minutes: Number(e.target.value)
                              })}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="note">メモ・備考</Label>
                          <Textarea
                            id="note"
                            value={editingAttendance.note || ''}
                            onChange={(e) => setEditingAttendance({
                              ...editingAttendance,
                              note: e.target.value
                            })}
                            rows={3}
                          />
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{getStaffName(attendance.staff_id)}</h3>
                              <p className="text-sm text-gray-500">{getStaffRank(attendance.staff_id)}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(attendance.status)}>
                            {getStatusText(attendance.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-gray-600 mb-1">出勤時刻</div>
                            <div className="font-medium">
                              {formatDateTime(attendance.clock_in)}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-gray-600 mb-1">退勤時刻</div>
                            <div className="font-medium">
                              {attendance.clock_out ? formatDateTime(attendance.clock_out) : '未退勤'}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-gray-600 mb-1">休憩時間</div>
                            <div className="font-medium">{attendance.break_minutes}分</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-gray-600 mb-1">稼働時間</div>
                            <div className="font-medium text-purple-600">
                              {workingHours.toFixed(1)}時間
                            </div>
                          </div>
                        </div>

                        {attendance.note && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-blue-800 text-sm">
                              <strong>備考:</strong> {attendance.note}
                            </p>
                          </div>
                        )}

                        {attendance.status === 'pending' && (
                          <div className="flex space-x-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => startEdit(attendance)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              修正
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveAttendance(attendance.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              承認
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => rejectAttendance(attendance.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              却下
                            </Button>
                          </div>
                        )}

                        {attendance.status === 'approved' && (
                          <div className="flex space-x-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => startEdit(attendance)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              修正
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => reverseApproval(attendance.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              承認取り消し
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {attendanceList.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">勤怠データがありません</h3>
              <p className="text-gray-500">選択した日付に勤怠データがありません</p>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}