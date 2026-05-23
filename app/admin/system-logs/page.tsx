'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';
import { getBusinessDayYmd } from '@/lib/business-day';

type LogRow = {
  id: number;
  created_at: string;
  business_date: string;
  table_label: string;
  action_type: string;
  original_amount: string | number | null;
  quantity: number | null;
  target_staff_label: string | null;
  item_name: string | null;
  ordered_at: string | null;
  payment_method: string | null;
  memo: string | null;
  session_id: number | null;
};

function formatDateJa(d: string | null | undefined) {
  if (!d) return '-';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return String(d);
  return x.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTimeJa(d: string | null | undefined) {
  if (!d) return '-';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return String(d);
  return x.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function SystemLogsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(getBusinessDayYmd());
  const [showAll, setShowAll] = useState(false);
  const [records, setRecords] = useState<LogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('admin_auth');
    if (raw) {
      try {
        setAdminUser(JSON.parse(raw));
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem('admin_auth');
      }
    }
    router.push('/admin-login');
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = showAll
        ? `/api/admin/log-records?all=1&limit=5000`
        : `/api/admin/log-records?date=${encodeURIComponent(selectedDate)}&limit=5000`;
      const res = await fetch(q, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setRecords(json.data?.records || []);
        setTotalCount(Number(json.data?.total_for_date) || 0);
      } else {
        setRecords([]);
        setTotalCount(0);
      }
    } catch {
      setRecords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showAll]);

  useEffect(() => {
    if (!adminUser) return;
    void load();
  }, [adminUser, load]);

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/90 border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <div className="flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-slate-700" />
            <h1 className="text-lg font-bold text-slate-900">システムログ</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">検索</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>営業日（フィルター）</Label>
              <Input
                type="date"
                className="w-44"
                value={selectedDate}
                disabled={showAll}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant={showAll ? 'default' : 'outline'}
              onClick={() => setShowAll((v) => !v)}
            >
              全レコード表示
            </Button>
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? '読込中…' : '再読込'}
            </Button>
            <div className="ml-auto text-sm text-slate-600">
              対象数: <span className="font-semibold tabular-nums">{totalCount}</span>
              {showAll ? '（全期間・直近5000件）' : `（${selectedDate}）`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">表形式</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100">
                    <TableHead className="whitespace-nowrap min-w-[7rem]">営業日</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[6rem]">テーブルID</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[8rem]">動作ログ内容</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[6rem]">元金額</TableHead>
                    <TableHead className="text-right whitespace-nowrap w-16">数量</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[6rem]">対象従業員ID</TableHead>
                    <TableHead className="min-w-[8rem]">項目</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[7rem]">注文時間</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[5rem]">支払い方法</TableHead>
                    <TableHead className="min-w-[6rem]">メモ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((row) => {
                      const isDelete = row.action_type === '明細削除';
                      const isReceiptPrint = row.action_type === 'レシート印刷';
                      const isRyoushushoPrint = row.action_type === '領収書印刷';
                      const actionClass = isDelete
                        ? 'bg-purple-100 text-purple-900 font-medium'
                        : isReceiptPrint
                          ? 'bg-red-100 text-red-900 font-medium'
                          : isRyoushushoPrint
                            ? 'bg-amber-100 text-amber-900 font-medium'
                            : '';
                      const amt = row.original_amount != null ? Number(row.original_amount) : null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatDateJa(row.business_date)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.table_label || '-'}</TableCell>
                          <TableCell className={actionClass}>{row.action_type}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {amt != null && Number.isFinite(amt) ? formatCurrency(amt) : '-'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {isDelete && row.quantity != null ? row.quantity : '-'}
                          </TableCell>
                          <TableCell>{isDelete ? row.target_staff_label || '-' : '-'}</TableCell>
                          <TableCell className="max-w-[14rem] break-words">
                            {isDelete ? row.item_name || '-' : '-'}
                          </TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap text-sm">
                            {isDelete ? formatTimeJa(row.ordered_at) : '-'}
                          </TableCell>
                          <TableCell>
                            {isReceiptPrint || isRyoushushoPrint ? row.payment_method || '-' : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 max-w-[12rem] break-words">
                            {row.memo || ''}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
