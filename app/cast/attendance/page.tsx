'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Clock, Play, Pause, Timer, Send, List, X,
  CheckCircle, AlertCircle
} from 'lucide-react';

interface TimeRecord {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number;
}

export default function CastAttendancePage() {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTimerStart, setCurrentTimerStart] = useState<string | null>(null);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [totalWorkTime, setTotalWorkTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeRecords, setShowTimeRecords] = useState(true);
  const [reportComment, setReportComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showNewSessionOption, setShowNewSessionOption] = useState(false);

  const router = useRouter();

  // 現在のユーザーIDを取得する関数
  const getCurrentUserId = () => {
    if (typeof window !== 'undefined') {
      // キャスト認証情報を取得
      const castAuth = localStorage.getItem('cast_auth');
      if (castAuth) {
        try {
          const parsedCastAuth = JSON.parse(castAuth);
          console.log('現在のキャスト認証情報:', parsedCastAuth);
          return parsedCastAuth.id || 1; // デフォルトは1
        } catch (err) {
          console.error('キャスト認証情報の解析に失敗:', err);
          return 1; // デフォルトは1
        }
      }
    }
    return 1; // デフォルトは1
  };

  useEffect(() => {
    loadTimeRecords();
    setIsLoading(false);
  }, []);

  // ページの可視性変更時の処理（タブ切り替えなど）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isTimerRunning && currentTimerStart) {
        // タイマー状態を保存
        const timerStateKey = `timer_state_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(timerStateKey, JSON.stringify({
          isRunning: true,
          startTime: currentTimerStart,
          timestamp: Date.now()
        }));
        console.log('ページ可視性変更: タイマー状態を保存');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTimerRunning, currentTimerStart]);

  // 送信済み状態の確認
  useEffect(() => {
    const submittedKey = `attendance_submitted_${new Date().toISOString().split('T')[0]}`;
    const isSubmitted = localStorage.getItem(submittedKey) === 'true';
    if (isSubmitted) {
      setIsSubmitted(true);
    }
  }, []);

  // タイマー状態の検証と自動復旧
  useEffect(() => {
    const timerStateKey = `timer_state_${new Date().toISOString().split('T')[0]}`;
    const savedTimerState = localStorage.getItem(timerStateKey);

    if (savedTimerState) {
      try {
        const timerState = JSON.parse(savedTimerState);
        if (timerState.isRunning && timerState.startTime) {
          // タイマーが進行中の場合、状態を復元
          setIsTimerRunning(true);
          setCurrentTimerStart(timerState.startTime);
          console.log('タイマー状態を復元:', timerState.startTime);
        }
      } catch (err) {
        console.error('タイマー状態の復元に失敗:', err);
      }
    }
  }, []);

  // 進行中のタイマーのリアルタイム更新
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && currentTimerStart) {
      // タイマー状態を定期的に保存
      const saveTimerState = () => {
        const timerStateKey = `timer_state_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(timerStateKey, JSON.stringify({
          isRunning: true,
          startTime: currentTimerStart,
          timestamp: Date.now()
        }));
      };

      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(currentTimerStart);
        const currentDuration = Math.floor((now.getTime() - start.getTime()) / 1000);

        // 進行中の記録の時間を更新
        setTimeRecords(prev => {
          const updatedRecords = prev.map(record =>
            record.startTime === currentTimerStart && !record.endTime
              ? { ...record, duration: currentDuration }
              : record
          );

          // 総勤務時間を再計算
          const total = updatedRecords.reduce((sum, record) => {
            if (record.endTime) {
              return sum + record.duration;
            } else {
              return sum + currentDuration;
            }
          }, 0);
          setTotalWorkTime(total);

          // 定期的にローカルストレージに保存
          saveTimeRecords(updatedRecords);
          saveTimerState();

          return updatedRecords;
        });
      }, 1000); // 1秒ごとに更新
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, currentTimerStart]);

  const loadTimeRecords = () => {
    const storageKey = `time_records_${new Date().toISOString().split('T')[0]}`;
    const submittedKey = `attendance_submitted_${new Date().toISOString().split('T')[0]}`;
    const commentKey = `attendance_comment_${new Date().toISOString().split('T')[0]}`;

    const savedRecords = localStorage.getItem(storageKey);
    const isSubmitted = localStorage.getItem(submittedKey) === 'true';
    const savedComment = localStorage.getItem(commentKey);

    if (savedRecords) {
      try {
        const records: TimeRecord[] = JSON.parse(savedRecords);
        setTimeRecords(records);
        setIsSubmitted(isSubmitted);
        setReportComment(savedComment || '');

        // 総勤務時間を計算
        const total = records.reduce((sum, record) => {
          if (record.endTime) {
            return sum + record.duration;
          } else {
            // 現在進行中の記録がある場合、現在時刻までの時間を計算
            const now = new Date();
            const start = new Date(record.startTime);
            return sum + Math.floor((now.getTime() - start.getTime()) / 1000);
          }
        }, 0);
        setTotalWorkTime(total);

        // 現在進行中の記録があるかチェック
        const activeRecord = records.find(r => !r.endTime);
        if (activeRecord) {
          setIsTimerRunning(true);
          setCurrentTimerStart(activeRecord.startTime);

          // 進行中の記録の時間を現在時刻で更新
          const now = new Date();
          const start = new Date(activeRecord.startTime);
          const currentDuration = Math.floor((now.getTime() - start.getTime()) / 1000);

          const updatedRecords = records.map(record =>
            record.id === activeRecord.id
              ? { ...record, duration: currentDuration }
              : record
          );
          setTimeRecords(updatedRecords);
          saveTimeRecords(updatedRecords);
        }
      } catch (err) {
        console.error('時間記録の読み込みに失敗しました:', err);
      }
    }
  };

  const saveTimeRecords = (records: TimeRecord[]) => {
    const storageKey = `time_records_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(storageKey, JSON.stringify(records));
  };

  const saveComment = (comment: string) => {
    const commentKey = `attendance_comment_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(commentKey, comment);
  };

  const saveSubmittedStatus = (submitted: boolean) => {
    const submittedKey = `attendance_submitted_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(submittedKey, submitted.toString());
  };

  const clearAllAttendanceData = () => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `time_records_${today}`;
    const commentKey = `attendance_comment_${today}`;
    const submittedKey = `attendance_submitted_${today}`;
    const timerStateKey = `timer_state_${today}`;

    localStorage.removeItem(storageKey);
    localStorage.removeItem(commentKey);
    localStorage.removeItem(submittedKey);
    localStorage.removeItem(timerStateKey);

    // 状態を完全にリセット
    setTimeRecords([]);
    setTotalWorkTime(0);
    setIsTimerRunning(false);
    setCurrentTimerStart(null);
    setReportComment('');
    setShowTimeRecords(true);
    setIsSubmitted(false);
    setShowNewSessionOption(true);
  };

  const startTimer = () => {
    const now = new Date().toISOString();
    const newRecord: TimeRecord = {
      id: `timer_${Date.now()}`,
      startTime: now,
      endTime: null,
      duration: 0
    };

    // 強制的にタイマー状態を設定
    setTimeRecords(prev => {
      const updatedRecords = [...prev, newRecord];
      saveTimeRecords(updatedRecords);
      return updatedRecords;
    });

    setIsTimerRunning(true);
    setCurrentTimerStart(now);
    setShowNewSessionOption(false);

    // タイマー状態をローカルストレージに保存
    const timerStateKey = `timer_state_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(timerStateKey, JSON.stringify({
      isRunning: true,
      startTime: now,
      timestamp: Date.now()
    }));

    console.log('タイマー開始:', now);
  };

  const startNewWorkSession = () => {
    setShowNewSessionOption(false);
    // 新しい勤務セッションの準備ができたことを示す
    console.log('新しい勤務セッションを開始します');
  };

  const stopTimer = () => {
    if (!currentTimerStart) return;

    const now = new Date().toISOString();
    const startTime = new Date(currentTimerStart);
    const endTime = new Date(now);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const updatedRecords = timeRecords.map(record =>
      record.startTime === currentTimerStart && !record.endTime
        ? { ...record, endTime: now, duration }
        : record
    );

    setTimeRecords(updatedRecords);
    saveTimeRecords(updatedRecords);
    setIsTimerRunning(false);
    setCurrentTimerStart(null);

    // タイマー状態をクリア
    const timerStateKey = `timer_state_${new Date().toISOString().split('T')[0]}`;
    localStorage.removeItem(timerStateKey);

    const newTotal = updatedRecords.reduce((sum, record) => sum + record.duration, 0);
    setTotalWorkTime(newTotal);

    console.log('タイマー停止:', now, '継続時間:', duration, '秒');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const sendReportToAdmin = async () => {
    if (timeRecords.length === 0) return;

    setIsSubmitting(true);

    try {
      // まずデータベース接続をテスト
      const testResponse = await fetch('/api/database/test');
      const testResult = await testResponse.json();

      if (!testResult.success) {
        alert('データベース接続に失敗しました: ' + testResult.error);
        return;
      }

      // attendanceテーブルが存在しない場合は作成
      if (!testResult.attendance_table_exists) {
        const createResponse = await fetch('/api/database/create-attendance-table', {
          method: 'POST'
        });
        const createResult = await createResponse.json();

        if (!createResult.success) {
          alert('テーブル作成に失敗しました: ' + createResult.error);
          return;
        }
      }

      // 勤怠データを送信
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: getCurrentUserId(), // 現在ログイン中のキャストのID（userテーブルのid）
          clock_in: timeRecords[0].startTime,
          clock_out: new Date().toISOString(),
          total_work_hours: totalWorkTime / 3600, // 秒を時間に変換
          comment: reportComment,
          detailed_times: timeRecords
        })
      });

      const result = await response.json();
      if (result.success) {
        // すべての勤怠データをクリア
        clearAllAttendanceData();

        alert('管理者に勤務時間を報告しました。新しい勤務記録を開始できます。');
      } else {
        alert('報告の送信に失敗しました: ' + (result.error || '不明なエラー'));
      }
    } catch (err) {
      console.error('報告送信エラー:', err);
      alert('報告の送信に失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
                onClick={() => router.push('/cast/dashboard')}
                className="self-start sm:self-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">ダッシュボード</span>
                <span className="sm:hidden">戻る</span>
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">勤怠管理</h1>
                <p className="text-xs sm:text-sm text-gray-500">出退勤・休憩時間の記録</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm">
                キャスト
              </Badge>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {new Date().toLocaleDateString('ja-JP')}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* タイム計測機能 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Timer className="w-5 h-5 mr-2" />
                  タイム計測
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {formatTime(totalWorkTime)}
                  </div>
                  <p className="text-sm text-gray-500">総勤務時間</p>
                </div>

                <div className="flex space-x-2">
                  {!isTimerRunning ? (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={startTimer}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      タイム開始
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={stopTimer}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      タイム停止
                    </Button>
                  )}
                </div>

                {/* <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowTimeRecords(true)}
                    className="flex-1"
                  >
                    <List className="w-4 h-4 mr-2" />
                    記録表示
                  </Button>
                </div> */}

                {timeRecords.length > 0 && !isSubmitted && (
                  <div className="mt-4">
                    <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center text-yellow-800">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">退勤時は報告送信を忘れずに</span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={sendReportToAdmin}
                      disabled={isSubmitting || isTimerRunning}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? '送信中...' : '管理者に報告送信'}
                    </Button>
                  </div>
                )}

                {showNewSessionOption && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-blue-800 mb-3">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">勤務記録送信完了</span>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      管理者に勤務時間を報告しました。新しい勤務記録を開始できます。
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={startNewWorkSession}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      新しい勤務記録を開始
                    </Button>
                  </div>
                )}

                {isSubmitted && !showNewSessionOption && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center text-green-800 mb-2">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">報告送信完了</span>
                    </div>
                    <p className="text-sm text-green-700">
                      管理者が勤怠データを確認し、承認処理を行います。
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 時間記録と報告 */}
          <div className="space-y-6">
            {showTimeRecords && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <List className="w-5 h-5 mr-2" />
                    時間記録
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">時間記録がありません</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {timeRecords.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {formatDateTime(record.startTime)}
                            </div>
                            {record.endTime && (
                              <div className="text-sm text-gray-500">
                                ～ {formatDateTime(record.endTime)}
                              </div>
                            )}
                            {!record.endTime && (
                              <div className="text-sm text-green-600 font-medium">
                                進行中
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-bold text-blue-600">
                            {formatTime(record.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {timeRecords.length > 0 && !isSubmitted && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="w-5 h-5 mr-2" />
                    管理者への報告
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="report-comment">報告コメント</Label>
                    <Textarea
                      id="report-comment"
                      value={reportComment}
                      onChange={(e) => {
                        setReportComment(e.target.value);
                        saveComment(e.target.value);
                      }}
                      placeholder="勤務内容や特記事項を入力してください..."
                      rows={3}
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    総勤務時間: {formatTime(totalWorkTime)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}