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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Clock, User, Calendar, MessageSquare, LogIn, LogOut, Search, Pencil, Trash2, DollarSign
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';
import PayrollDailyCastReadOnlyTable, {
  PayrollRoundingMode,
  PayrollRoundingUnit,
} from '@/components/admin/PayrollDailyCastReadOnlyTable';
import { getBusinessDayYmd } from '@/lib/business-day';

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

/** ローカル日付 YYYY-MM-DD（カレンダー日付。実時刻のタイムスタンプ生成用） */
function getLocalYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * ユーザが入力した「時:分」を、現在の業務日に属する妥当なタイムスタンプに解決する。
 *
 * - 例：朝5時 JST に「23:00」と入力された場合、ユーザの意図は「昨夜23時」なので
 *   昨日の日付を採用する。
 * - 入力結果が現在時刻より未来になる場合は1日前にずらす。
 * - これによりカレンダー日付ではなく業務日（朝6時境界）に沿った打刻ができる。
 */
function buildClockTimeForBusinessDay(hour: number, minute: number): Date {
  const now = new Date();
  let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (candidate.getTime() > now.getTime() + 60 * 1000) {
    // 1分の許容幅を見て、それでも未来なら昨日の同時刻として解釈
    candidate = new Date(candidate.getTime() - 24 * 60 * 60 * 1000);
  }
  return candidate;
}

/** 出勤時刻のデフォルト: 現在時刻（そのまま） */
function defaultClockInHourMinute(): { hour: string; minute: string } {
  const now = new Date();
  return {
    hour: String(now.getHours()).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
  };
}

/** datetime-local 用 YYYY-MM-DDTHH:mm（ローカル） */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
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
  /** 本日シフト登録があるキャストのみ表示（デフォルトON） */
  const [showScheduledOnly, setShowScheduledOnly] = useState(true);
  const [scheduledCastIds, setScheduledCastIds] = useState<number[]>([]);
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [clockInHour, setClockInHour] = useState<string>('09');
  const [clockInMinute, setClockInMinute] = useState<string>('00');
  const [searchQuery, setSearchQuery] = useState('');
  const [clockOutHour, setClockOutHour] = useState<string>('');
  const [clockOutMinute, setClockOutMinute] = useState<string>('');
  /** キャスト別売上（給与プレビュー日付モードと同じ集計）の対象日（業務日：朝6時JST 基準） */
  const [salesReportDate, setSalesReportDate] = useState<string>(() => getBusinessDayYmd());
  const [historyEditRecord, setHistoryEditRecord] = useState<AttendanceRecord | null>(null);
  const [isHistoryEditModalOpen, setIsHistoryEditModalOpen] = useState(false);
  const [historyEditClockIn, setHistoryEditClockIn] = useState('');
  const [historyEditClockOut, setHistoryEditClockOut] = useState('');
  const [payrollRefreshIntervalMinutes, setPayrollRefreshIntervalMinutes] = useState<number>(15);
  const [isPayrollRoundingModalOpen, setIsPayrollRoundingModalOpen] = useState(false);
  const [payrollRoundingUnit, setPayrollRoundingUnit] = useState<PayrollRoundingUnit>(1);
  const [payrollRoundingMode, setPayrollRoundingMode] = useState<PayrollRoundingMode>('round');

  const router = useRouter();
  const { success, error, confirm } = useNotificationContext();

  useEffect(() => {
    // 管理者認証情報を確認
    const adminAuth = localStorage.getItem('admin_auth');
    if (adminAuth) {
      try {
        const parsedAdminAuth = JSON.parse(adminAuth);
        setAdminUser(parsedAdminAuth);
        setIsLoading(false);
        loadCasts();
        loadTodayShiftCastIds();
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

  /**
   * shift テーブルから「本日（業務日：朝6時JST境界）」出勤予定のキャストID一覧。
   * 深夜0時を跨いでも同じ業務日が維持されるため、出勤しているキャストが
   * 翌日扱いになって消えてしまう不具合を防ぐ。
   */
  const loadTodayShiftCastIds = async () => {
    try {
      const ymd = getBusinessDayYmd();
      const response = await fetch(`/api/shifts?date=${encodeURIComponent(ymd)}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const ids: number[] = Array.from(
          new Set<number>(result.data.map((row: { cast_id: number }) => Number(row.cast_id)))
        );
        setScheduledCastIds(ids);
      } else {
        setScheduledCastIds([]);
      }
    } catch (err) {
      console.error('本日シフト取得エラー:', err);
      setScheduledCastIds([]);
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

  const openHistoryEdit = (record: AttendanceRecord) => {
    if (!record.clock_out) {
      error('エラー', '退勤が未登録の記録は変更できません');
      return;
    }
    setHistoryEditRecord(record);
    setHistoryEditClockIn(toDatetimeLocalValue(record.clock_in));
    setHistoryEditClockOut(toDatetimeLocalValue(record.clock_out));
    setIsHistoryEditModalOpen(true);
  };

  const saveHistoryEdit = async () => {
    if (!historyEditRecord || !adminUser) return;
    if (!historyEditClockIn.trim() || !historyEditClockOut.trim()) {
      error('エラー', '出勤時間と退勤時間を入力してください');
      return;
    }
    const inD = new Date(historyEditClockIn);
    const outD = new Date(historyEditClockOut);
    if (Number.isNaN(inD.getTime()) || Number.isNaN(outD.getTime())) {
      error('エラー', '日時の形式が正しくありません');
      return;
    }
    if (outD.getTime() <= inD.getTime()) {
      error('エラー', '退勤時間は出勤時間より後である必要があります');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/attendance/${historyEditRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clock_in: inD.toISOString(),
          clock_out: outD.toISOString(),
          status: 'saved',
          approved_by: adminUser.id,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        error('エラー', result.error || '勤怠の更新に失敗しました');
        return;
      }
      success('更新しました', `${historyEditRecord.staff_name}さんの勤怠を更新しました`);
      setIsHistoryEditModalOpen(false);
      setHistoryEditRecord(null);
      await loadAttendanceHistory();
      await loadActiveAttendances();
    } catch (e) {
      console.error(e);
      error('エラー', '勤怠の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteHistory = (record: AttendanceRecord) => {
    confirm(
      '勤怠記録の削除',
      `「${record.staff_name}」のこの勤怠記録（出勤〜退勤）を削除します。給与集計に反映済みの場合は工数が戻ります。よろしいですか？`,
      async () => {
        setIsSubmitting(true);
        try {
          const res = await fetch(
            `/api/attendance/${record.id}?allow_completed=1`,
            { method: 'DELETE' }
          );
          const j = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
          if (!res.ok || !j.success) {
            error('エラー', j.error || '削除に失敗しました');
            return;
          }
          success('削除しました', '勤怠記録を削除しました');
          await loadAttendanceHistory();
          await loadActiveAttendances();
        } catch (e) {
          console.error(e);
          error('エラー', '削除に失敗しました');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
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
      setSelectedCast(cast);
      const { hour, minute } = defaultClockInHourMinute();
      setClockInHour(hour);
      setClockInMinute(minute);
      setIsClockInModalOpen(true);
    }
  };

  const executeClockIn = async () => {
    if (!selectedCast) return;
    const hour = parseInt(clockInHour, 10);
    const minute = parseInt(clockInMinute, 10);
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      error('エラー', '出勤時間を正しく選択してください');
      return;
    }

    setIsSubmitting(true);
    try {
      // 入力された時:分を、業務日（朝6時JST境界）を考慮して妥当なタイムスタンプに解決する。
      // 例：朝5時に「23:00」が入力された場合は、昨夜23時として扱う。
      const clockInLocal = buildClockTimeForBusinessDay(hour, minute);
      const clockInTime = clockInLocal.toISOString();

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedCast.id,
          clock_in: clockInTime
        })
      });

      const result = await response.json();
      if (result.success) {
        try {
          await fetch(`/api/casts/${selectedCast.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendance_status: 1 })
          });
        } catch (err) {
          console.error('出勤状態更新エラー:', err);
        }

        success('出勤記録完了', `${selectedCast.name}さんの出勤を記録しました`);
        setIsClockInModalOpen(false);
        setSelectedCast(null);
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
      // 入力された時・分を使用
      const hour = parseInt(clockOutHour);
      const minute = parseInt(clockOutMinute);
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        error('エラー', '正しい時間を入力してください');
        setIsSubmitting(false);
        return;
      }

      // 業務日（朝6時JST境界）を考慮して妥当なタイムスタンプを構築する。
      // 例：朝5時に「23:00」が入力された場合は、昨夜23時として扱う。
      const clockOutLocal = buildClockTimeForBusinessDay(hour, minute);
      const clockOutTime = clockOutLocal.toISOString();
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

  /** 退勤モーダルのキャンセル：進行中の attendance を削除し user の出勤状態をリセット */
  const handleCancelClockOutRecord = async () => {
    if (!selectedCast) {
      setIsModalOpen(false);
      return;
    }
    const activeAttendance = activeAttendances.get(selectedCast.id);
    if (!activeAttendance) {
      setIsModalOpen(false);
      setSelectedCast(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/attendance/${activeAttendance.id}`, { method: 'DELETE' });
      const j = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };

      if (!res.ok || !j.success) {
        error('エラー', j.error || '出勤記録の取り消しに失敗しました');
        return;
      }

      try {
        await fetch(`/api/casts/${selectedCast.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendance_status: 0 }),
        });
      } catch (err) {
        console.error('出勤状態更新エラー:', err);
      }

      success('取り消しました', `${selectedCast.name}さんの出勤記録を削除しました`);
      setIsModalOpen(false);
      setSelectedCast(null);
      await loadActiveAttendances();
      await loadAttendanceHistory();
    } catch (e) {
      console.error('出勤記録取り消しエラー:', e);
      error('エラー', '出勤記録の取り消しに失敗しました');
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

  // フィルタリング適用（shift テーブル: 本日付の行があるキャスト＝出勤予定）
  const filteredCasts = casts.filter(cast => {
    const isActive = activeAttendances.has(cast.id);
    if (showScheduledOnly) {
      if (!scheduledCastIds.includes(cast.id)) return false;
    }
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
            {/* <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="payroll-refresh-interval" className="text-xs sm:text-sm whitespace-nowrap">
                  更新間隔
                </Label>
                <Select
                  value={String(payrollRefreshIntervalMinutes)}
                  onValueChange={(value) => setPayrollRefreshIntervalMinutes(Number(value) || 15)}
                >
                  <SelectTrigger id="payroll-refresh-interval" className="w-[112px] h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1分</SelectItem>
                    <SelectItem value="5">5分</SelectItem>
                    <SelectItem value="15">15分</SelectItem>
                    <SelectItem value="30">30分</SelectItem>
                    <SelectItem value="60">60分</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 bg-white"
                onClick={() => setIsPayrollRoundingModalOpen(true)}
              >
                給与丸め設定
              </Button>
            </div> */}
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
                        id="show-scheduled"
                        checked={showScheduledOnly}
                        onCheckedChange={(checked) => setShowScheduledOnly(checked as boolean)}
                      />
                      <Label htmlFor="show-scheduled" className="text-sm font-normal cursor-pointer whitespace-nowrap">
                        出勤予定のみ
                      </Label>
                    </div>
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
                        : showScheduledOnly && scheduledCastIds.length === 0
                          ? '本日の出勤予定シフトが登録されていません（シフト管理で登録してください）'
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
                            <div key={cast.id}>
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

            <Card className="mt-6 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    キャスト別 給与計算
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label htmlFor="sales-report-date" className="text-sm whitespace-nowrap">
                      日付
                    </Label>
                    <Input
                      id="sales-report-date"
                      type="date"
                      value={salesReportDate}
                      onChange={(e) => setSalesReportDate(e.target.value || getLocalYmd())}
                      className="w-[160px] sm:w-[180px]"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  給与プレビュー（日付指定）と同じ集計です。キャスト名と当日の売上・バック状況を確認できます。
                </p>
              </CardHeader>
              <CardContent className="p-0 sm:p-4 pt-0 sm:pt-0">
                <PayrollDailyCastReadOnlyTable
                  date={salesReportDate}
                  refreshIntervalMinutes={payrollRefreshIntervalMinutes}
                  roundingUnit={payrollRoundingUnit}
                  roundingMode={payrollRoundingMode}
                />
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
                            <TableHead className="text-center w-[100px]">操作</TableHead>
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
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => openHistoryEdit(record)}
                                  disabled={isSubmitting}
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-1" />
                                  変更
                                </Button>
                                
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap">
                              <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => requestDeleteHistory(record)}
                                  disabled={isSubmitting}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /></Button>
                              </div>
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

      {/* 給与丸め設定モーダル */}
      <Dialog open={isPayrollRoundingModalOpen} onOpenChange={setIsPayrollRoundingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              給与丸め設定
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payroll-rounding-unit">丸め単位</Label>
              <Select
                value={String(payrollRoundingUnit)}
                onValueChange={(value) => {
                  const n = Number(value);
                  setPayrollRoundingUnit((n === 10 || n === 100 ? n : 1) as PayrollRoundingUnit);
                }}
              >
                <SelectTrigger id="payroll-rounding-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1円</SelectItem>
                  <SelectItem value="10">10円</SelectItem>
                  <SelectItem value="100">100円</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payroll-rounding-mode">丸め方法</Label>
              <Select
                value={payrollRoundingMode}
                onValueChange={(value) =>
                  setPayrollRoundingMode(value === 'floor' ? 'floor' : 'round')
                }
              >
                <SelectTrigger id="payroll-rounding-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">四捨五入</SelectItem>
                  <SelectItem value="floor">切り捨て</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <div>例: 9,158円</div>
              <div>100円 + 切り捨て: 9,100円 / 四捨五入: 9,200円</div>
              <div>10円 + 切り捨て: 9,150円 / 四捨五入: 9,160円</div>
              <div>1円: 9,158円</div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsPayrollRoundingModalOpen(false)}>
                設定を閉じる
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 出勤記録モーダル（時間選択・キャンセルで取り消し） */}
      <Dialog
        open={isClockInModalOpen}
        onOpenChange={(open) => {
          setIsClockInModalOpen(open);
          if (!open) setSelectedCast(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <LogIn className="w-5 h-5 mr-2" />
              出勤記録
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
                <p className="text-xs text-muted-foreground mt-1 mb-2">デフォルトは現在時刻です。変更できます。</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Select value={clockInHour} onValueChange={setClockInHour}>
                    <SelectTrigger className="w-[88px]">
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>
                          {String(i).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-gray-500">時</span>
                  <Select value={clockInMinute} onValueChange={setClockInMinute}>
                    <SelectTrigger className="w-[88px]">
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-gray-500">分</span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsClockInModalOpen(false);
                    setSelectedCast(null);
                  }}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button onClick={executeClockIn} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                  {isSubmitting ? (
                    '処理中...'
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      出勤を確定
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 退勤モーダル */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setSelectedCast(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <LogOut className="w-5 h-5 mr-2" />
              退勤記録
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

              <div className="flex w-full flex-row items-center justify-between gap-3 border-t pt-4 mt-2">
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => void handleCancelClockOutRecord()}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={isSubmitting}
                  className="shrink-0 bg-orange-600 hover:bg-orange-700"
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 出勤・退勤履歴の編集 */}
      <Dialog
        open={isHistoryEditModalOpen}
        onOpenChange={(open) => {
          setIsHistoryEditModalOpen(open);
          if (!open) {
            setHistoryEditRecord(null);
            setHistoryEditClockIn('');
            setHistoryEditClockOut('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              勤怠の変更
            </DialogTitle>
          </DialogHeader>
          {historyEditRecord && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <span className="font-medium">{historyEditRecord.staff_name}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hist-clock-in">出勤日時</Label>
                <Input
                  id="hist-clock-in"
                  type="datetime-local"
                  value={historyEditClockIn}
                  onChange={(e) => setHistoryEditClockIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hist-clock-out">退勤日時</Label>
                <Input
                  id="hist-clock-out"
                  type="datetime-local"
                  value={historyEditClockOut}
                  onChange={(e) => setHistoryEditClockOut(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsHistoryEditModalOpen(false)}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => void saveHistoryEdit()}
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
