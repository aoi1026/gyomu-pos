'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Calendar, CheckCircle, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface Cast {
  id: number;
  name: string;
}

interface Shift {
  id: number;
  cast_id: number;
  date: string;
  cast_name: string;
}

export default function ShiftsPage() {
  const router = useRouter();
  const { success, error, confirm } = useNotificationContext();
  const [casts, setCasts] = useState<Cast[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{castId: number, date: string} | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const shiftTableScrollRef = useRef<HTMLDivElement | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 当月の全日付を取得
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const daysInMonth = getDaysInMonth();

  // 曜日を取得（0=日曜日, 6=土曜日）
  const getDayOfWeek = (date: Date): number => {
    return date.getDay();
  };

  // 曜日名を取得
  const getDayName = (day: number): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[day];
  };

  // キャスト一覧を取得
  const loadCasts = async () => {
    try {
      const response = await fetch('/api/casts');
      const result = await response.json();
      if (result.success) {
        // IDで降順にソート
        const sortedCasts = result.data.sort((a: Cast, b: Cast) => b.id - a.id);
        setCasts(sortedCasts);
      }
    } catch (err) {
      console.error('キャスト取得エラー:', err);
      error('エラー', 'キャスト一覧の取得に失敗しました');
    }
  };

  // シフトデータを取得
  const loadShifts = async () => {
    try {
      const response = await fetch(`/api/shifts?year=${year}&month=${month + 1}`);
      const result = await response.json();
      if (result.success) {
        // 日付を正規化（YYYY-MM-DD形式に統一）
        const normalizedShifts = result.data.map((shift: Shift) => {
          let dateStr: string;
          if (typeof shift.date === 'string') {
            dateStr = shift.date.split('T')[0];
          } else {
            // Dateオブジェクトの場合は、ローカル時間で日付文字列を生成
            const date = new Date(shift.date);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
          }
          return { ...shift, date: dateStr };
        });
        setShifts(normalizedShifts);
      }
    } catch (err) {
      console.error('シフト取得エラー:', err);
      error('エラー', 'シフトデータの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCasts();
  }, []);

  useEffect(() => {
    if (casts.length > 0) {
      loadShifts();
    }
  }, [year, month, casts.length]);

  /** 表示中の月が今月のとき、水平スクロールを本日の日付列が「名前」の直後に来る位置へ */
  useLayoutEffect(() => {
    if (isLoading || casts.length === 0) return;
    const now = new Date();
    if (now.getFullYear() !== year || now.getMonth() !== month) return;

    const scrollEl = shiftTableScrollRef.current;
    if (!scrollEl) return;

    const day = now.getDate();
    const dayTh = scrollEl.querySelector(`#shift-header-day-${day}`);
    const nameTh = scrollEl.querySelector('#shift-header-name');
    if (!dayTh || !nameTh) return;

    const applyScroll = () => {
      const nameRect = nameTh.getBoundingClientRect();
      const dayRect = (dayTh as HTMLElement).getBoundingClientRect();
      const delta = dayRect.left - nameRect.right;
      scrollEl.scrollLeft = Math.max(0, scrollEl.scrollLeft + delta);
    };

    requestAnimationFrame(() => {
      applyScroll();
      requestAnimationFrame(applyScroll);
    });
  }, [isLoading, year, month, casts.length, shifts.length, daysInMonth.length]);

  // 指定されたキャストと日付のシフトが存在するかチェック
  const hasShift = (castId: number, date: Date): boolean => {
    // ローカル時間で日付文字列を生成（YYYY-MM-DD形式）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // シフトデータと比較（データベースから返される日付形式に合わせる）
    const found = shifts.some(s => {
      // 日付の比較（文字列形式を正規化）
      const shiftDate = s.date.split('T')[0]; // タイムスタンプが含まれている場合に備える
      return s.cast_id === castId && shiftDate === dateStr;
    });
    
    return found;
  };

  // キャストの出勤予約日数を計算
  const getShiftCount = (castId: number): number => {
    return shifts.filter(s => s.cast_id === castId).length;
  };

  // セルクリック処理
  const handleCellClick = (castId: number, date: Date) => {
    // ローカル時間で日付文字列を生成（YYYY-MM-DD形式）
    // 注意: getFullYear(), getMonth(), getDate()はローカル時間を使用する
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const isRegistered = hasShift(castId, date);
    setSelectedCell({ castId, date: dateStr });
    setIsRegistering(!isRegistered);
    setShowConfirmDialog(true);
  };

  // シフト登録
  const registerShift = async () => {
    if (!selectedCell) return;

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cast_id: selectedCell.castId,
          date: selectedCell.date
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'シフトの登録に失敗しました');
      }

      await loadShifts();
      setShowConfirmDialog(false);
      setSelectedCell(null);
      success('登録完了', '出勤予約日を登録しました');
    } catch (err) {
      console.error('シフト登録エラー:', err);
      error('エラー', err instanceof Error ? err.message : 'シフトの登録に失敗しました');
    }
  };

  // シフト削除
  const deleteShift = async () => {
    if (!selectedCell) return;

    try {
      const response = await fetch(`/api/shifts?cast_id=${selectedCell.castId}&date=${selectedCell.date}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'シフトの削除に失敗しました');
      }

      await loadShifts();
      setShowConfirmDialog(false);
      setSelectedCell(null);
      success('削除完了', '出勤予約を解除しました');
    } catch (err) {
      console.error('シフト削除エラー:', err);
      error('エラー', err instanceof Error ? err.message : 'シフトの削除に失敗しました');
    }
  };

  // 確認ダイアログの処理
  const handleConfirm = () => {
    if (isRegistering) {
      registerShift();
    } else {
      deleteShift();
    }
  };

  // 前月に移動
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 次月に移動
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <RoleGate allowedRoles={['admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ダッシュボード
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">シフト管理</h1>
                  <p className="text-sm text-gray-500">キャストの出勤予約日を管理</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 月選択 */}
          <Card className="mb-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousMonth}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-4">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-lg font-semibold">
                    {year}年{month + 1}月
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextMonth}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* シフト表（縦スクロール＋日付行固定。高さはビューポートに合わせて調整） */}
          <Card className="shadow-xl border border-gray-200 rounded-xl overflow-hidden bg-white">
            <CardContent className="p-0 bg-white">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div
                  ref={shiftTableScrollRef}
                  className="max-h-[min(70vh,calc(100vh-15rem))] sm:max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain relative"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="border-b text-center border-gray-300">
                          <th
                            id="shift-header-name"
                            className="sticky left-0 top-0 z-40 bg-blue-50 border-r border-gray-300 px-5 py-4 text-center font-bold min-w-[180px] shadow-[2px_0_4px_rgba(0,0,0,0.1)] text-blue-700 text-sm"
                          >
                            名前
                          </th>
                          {daysInMonth.map((date) => {
                            const dayOfWeek = getDayOfWeek(date);
                            const dayName = getDayName(dayOfWeek);
                            const isSaturday = dayOfWeek === 6;
                            const isSunday = dayOfWeek === 0;
                            return (
                              <th
                                key={date.toISOString()}
                                id={`shift-header-day-${date.getDate()}`}
                                className={`sticky top-0 z-30 border-r border-gray-300 px-3 py-3 text-center min-w-[75px] shadow-[0_4px_6px_-2px_rgba(0,0,0,0.08)] ${
                                  isSaturday
                                    ? 'bg-blue-50'
                                    : isSunday
                                    ? 'bg-red-50'
                                    : 'bg-gray-50'
                                }`}
                              >
                                <div className={`text-base font-bold mb-1 ${
                                  isSaturday
                                    ? 'text-blue-600'
                                    : isSunday
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}>{date.getDate()}</div>
                                <div
                                  className={`text-xs font-semibold ${
                                    isSaturday
                                      ? 'text-blue-500'
                                      : isSunday
                                      ? 'text-red-500'
                                      : 'text-gray-600'
                                  }`}
                                >
                                  {dayName}
                                </div>
                              </th>
                            );
                          })}
                          <th className="sticky right-0 top-0 z-40 bg-purple-50 border-l border-gray-300 px-5 py-4 text-center font-bold min-w-[140px] shadow-[-2px_0_4px_rgba(0,0,0,0.1)] text-purple-700 text-sm">
                            日数
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {casts.map((cast, index) => {
                          const isEvenRow = index % 2 === 0;
                          return (
                            <tr 
                              key={cast.id} 
                              className={`border-b border-gray-200 transition-colors duration-100 ${
                                isEvenRow 
                                  ? 'bg-white hover:bg-gray-50' 
                                  : 'bg-gray-50/30 hover:bg-gray-100'
                              }`}
                            >
                              <td className="sticky left-0 z-20 bg-blue-50 border-r border-gray-300 px-5 py-4 text-center font-semibold shadow-[2px_0_4px_rgba(0,0,0,0.1)] text-blue-700 text-sm">
                                {cast.name}
                              </td>
                              {daysInMonth.map((date) => {
                                const hasShiftForDate = hasShift(cast.id, date);
                                const cellDayOfWeek = getDayOfWeek(date);
                                const isSaturday = cellDayOfWeek === 6;
                                const isSunday = cellDayOfWeek === 0;
                                return (
                                  <td
                                    key={date.toISOString()}
                                    className={`border-r border-gray-200 px-3 py-4 text-center cursor-pointer transition-all duration-150 min-h-[56px] ${
                                      hasShiftForDate
                                        ? 'bg-gradient-to-br from-green-400 via-green-480 to-green-400 hover:from-green-400 hover:via-green-300 hover:to-green-400 shadow-inner rounded-md'
                                        : isSaturday
                                        ? 'bg-blue-50/50 hover:bg-blue-100'
                                        : isSunday
                                        ? 'bg-red-50/50 hover:bg-red-100'
                                        : 'hover:bg-gray-100'
                                    }`}
                                    onClick={() => handleCellClick(cast.id, date)}
                                    style={hasShiftForDate ? {
                                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)'
                                    } : {}}
                                  >
                                    {hasShiftForDate && (
                                      <div className="flex items-center justify-center">
                                        <Heart className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="sticky right-0 z-20 bg-purple-50 border-l border-gray-300 px-5 py-4 text-center font-bold shadow-[-2px_0_4px_rgba(0,0,0,0.1)] text-sm">
                                <span className="inline-flex items-center justify-center min-w-[36px] h-8 px-3 rounded-md bg-purple-200 text-purple-800 font-bold text-sm border border-purple-400">
                                  {getShiftCount(cast.id)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 確認ダイアログ */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isRegistering ? '出勤予約日の登録' : '出勤予約の解除'}
              </DialogTitle>
              <DialogDescription>
                {isRegistering
                  ? '出勤予約日として登録しますか？'
                  : '出勤予約を解除しますか？'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setSelectedCell(null);
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleConfirm}
                className={isRegistering ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {isRegistering ? '登録' : '解除'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  );
}

