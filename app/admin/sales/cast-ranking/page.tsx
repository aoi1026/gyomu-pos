'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, RefreshCw, Trophy, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';

type RankingRow = {
  rank: number;
  cast_id: number;
  cast_name: string;
  attendance_days: number;
  together_count: number;
  main_count: number;
  inside_count: number;
  main_sales: number;
  points: number;
};

function CastRankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error } = useNotificationContext();

  const now = new Date();
  const initialYear = Number(searchParams.get('year')) || now.getFullYear();
  const initialMonth = Number(searchParams.get('month')) || now.getMonth() + 1;

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const monthLabel = useMemo(() => `${year}年${month}月`, [year, month]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cast-ranking?year=${year}&month=${month}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '取得に失敗しました');
      setRows(json.data?.rows || []);
    } catch (e) {
      console.error('キャストランキング取得エラー:', e);
      error('エラー', e instanceof Error ? e.message : 'キャストランキングの取得に失敗しました');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  return (
    <RoleGate allowedRoles={['admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/sales/monthly')}
                  className="self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">月次売上に戻る</span>
                  <span className="sm:hidden">戻る</span>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">キャスト月間ランキング</h1>
                  <p className="text-xs sm:text-sm text-gray-500">{monthLabel}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={load} className="flex-1 sm:flex-none">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">更新</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">期間選択</h3>
                </div>
                <div className="flex items-end space-x-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="year">年</Label>
                    <Input
                      id="year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Math.max(2000, Math.min(2100, Number(e.target.value) || year)))}
                      className="w-28"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="month">月</Label>
                    <Input
                      id="month"
                      type="number"
                      min={1}
                      max={12}
                      value={month}
                      onChange={(e) => setMonth(Math.max(1, Math.min(12, Number(e.target.value) || month)))}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-amber-600" />
                ランキング（{monthLabel}）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-500">読み込み中...</div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  表示できるデータがありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14 text-center">順位</TableHead>
                        <TableHead className="min-w-[160px]">キャスト</TableHead>
                        <TableHead className="text-right">出勤数</TableHead>
                        <TableHead className="text-right">同伴指名数</TableHead>
                        <TableHead className="text-right">本人指名数</TableHead>
                        <TableHead className="text-right">場内指名数</TableHead>
                        <TableHead className="text-right">本人指名売上高</TableHead>
                        <TableHead className="text-right">ポイント</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow
                          key={r.cast_id}
                          className={
                            r.rank <= 3
                              ? 'bg-red-50/70 text-red-950'
                              : r.rank <= 5
                                ? 'bg-blue-50/70 text-blue-950'
                                : undefined
                          }
                        >
                          <TableCell className="text-center font-semibold">{r.rank}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>{r.cast_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{r.attendance_days}</TableCell>
                          <TableCell className="text-right">{r.together_count}</TableCell>
                          <TableCell className="text-right">{r.main_count}</TableCell>
                          <TableCell className="text-right">{r.inside_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.main_sales)}</TableCell>
                          <TableCell className="text-right">{r.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}

export default function CastRankingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">読み込み中...</div>}>
      <CastRankingContent />
    </Suspense>
  );
}
