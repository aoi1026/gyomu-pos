'use client';

export const dynamic = 'force-dynamic';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, CreditCard, Users } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/mock-data';

function formatDateTime(dateString: string | null) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function DailyTableDetailPage({ params }: { params: Promise<{ tableId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const tableId = Number(resolvedParams.tableId);

  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [adminAuth, setAdminAuth] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editMap, setEditMap] = useState<Record<string, { unit_price: string; quantity: string; total: string }>>({});
  const [costEditMap, setCostEditMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // admin_auth を読み込み（super_admin 判定に使う）
    const raw = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') : null;
    if (raw) {
      try {
        setAdminAuth(JSON.parse(raw));
      } catch {
        setAdminAuth(null);
      }
    }

    const load = async () => {
      if (!Number.isFinite(tableId) || tableId <= 0) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/sales/daily-table-detail?table_id=${tableId}&date=${encodeURIComponent(date)}`, { cache: 'no-store' });
        const result = await res.json();
        if (result.success) {
          setSessions(result.data?.sessions || []);
        } else {
          setSessions([]);
        }
      } catch {
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tableId, date]);

  const title = useMemo(() => `テーブル ${tableId} 詳細（${date}）`, [tableId, date]);
  const isSuperAdmin = useMemo(() => {
    const role = String(adminAuth?.role || '');
    return role === 'super_admin';
  }, [adminAuth]);

  const getEditKey = (sessionId: any, itemKey: any) => `${String(sessionId)}::${String(itemKey)}`;

  const ensureEditRow = (sessionId: any, item: any) => {
    const itemKey = String(item?.item_key || '');
    if (!itemKey) return;
    const k = getEditKey(sessionId, itemKey);
    setEditMap((prev) => {
      if (prev[k]) return prev;
      return {
        ...prev,
        [k]: {
          unit_price: String(item?.unit_price ?? ''),
          quantity: item?.quantity === null || item?.quantity === undefined ? '' : String(item.quantity),
          total: String(item?.total ?? ''),
        }
      };
    });
  };

  const saveOverride = async (sessionId: any, item: any) => {
    if (!isSuperAdmin) return;
    const itemKey = String(item?.item_key || '');
    if (!itemKey) return;

    const k = getEditKey(sessionId, itemKey);
    const row = editMap[k];
    if (!row) return;

    setIsSaving(true);
    try {
      const body: any = {
        session_id: Number(sessionId),
        item_key: itemKey,
        unit_price: row.unit_price === '' ? null : Number(row.unit_price),
        quantity: row.quantity === '' ? null : Number(row.quantity),
        total: row.total === '' ? null : Number(row.total),
      };

      const res = await fetch('/api/admin/sales/daily-table-detail', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': String(adminAuth?.id || ''),
        },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!result?.success) {
        // eslint-disable-next-line no-alert
        alert(result?.error || '保存に失敗しました');
        return;
      }

      // 再読み込みして表示を反映
      const reload = await fetch(
        `/api/admin/sales/daily-table-detail?table_id=${tableId}&date=${encodeURIComponent(date)}`,
        { cache: 'no-store' }
      );
      const reloadResult = await reload.json();
      if (reloadResult.success) setSessions(reloadResult.data?.sessions || []);
    } finally {
      setIsSaving(false);
    }
  };

  const saveCost = async (sessionId: any) => {
    if (!isSuperAdmin) return;
    const v = costEditMap[String(sessionId)];
    const costNum = Number(String(v ?? '').replace(',', '.'));
    if (!Number.isFinite(costNum) || costNum < 0) {
      // eslint-disable-next-line no-alert
      alert('支払額（cost）は0以上の数値を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/sales/daily-table-detail', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': String(adminAuth?.id || ''),
        },
        body: JSON.stringify({
          session_id: Number(sessionId),
          cost: costNum,
        }),
      });
      const result = await res.json();
      if (!result?.success) {
        // eslint-disable-next-line no-alert
        alert(result?.error || '保存に失敗しました');
        return;
      }

      const reload = await fetch(
        `/api/admin/sales/daily-table-detail?table_id=${tableId}&date=${encodeURIComponent(date)}`,
        { cache: 'no-store' }
      );
      const reloadResult = await reload.json();
      if (reloadResult.success) setSessions(reloadResult.data?.sessions || []);
    } finally {
      setIsSaving(false);
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
    <RoleGate allowedRoles={['admin', 'super_admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/sales/daily?date=${encodeURIComponent(date)}`)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  戻る
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
                  <p className="text-xs sm:text-sm text-gray-500">該当日に終了したセッションの明細</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-gray-600">該当するセッションがありません（条件: end_at が {date} のもの）</CardContent>
            </Card>
          ) : (
            sessions.map((s: any) => {
              const items: any[] = Array.isArray(s.items) ? s.items : (s.items ? JSON.parse(s.items) : []);
              const nonPaymentItems = items.filter((it: any) => String(it?.category) !== '決済');
              const paymentItems = items.filter((it: any) => String(it?.category) === '決済');
              const subtotal = nonPaymentItems.reduce((sum: number, it: any) => sum + (Number(it?.total) || 0), 0);
              const paymentTotal = paymentItems.reduce((sum: number, it: any) => sum + (Number(it?.total) || 0), 0);
              const castList: any[] = Array.isArray(s.cast_list) ? s.cast_list : (s.cast_list ? JSON.parse(s.cast_list) : []);
              return (
                <Card key={s.id} className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        セッションID: {s.id}
                      </span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {s.pay_type_label || '-'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* 左：セッション情報 */}
                      <div className="space-y-3">
                        <div className="p-4 bg-white rounded-lg border">
                          <div className="text-xs text-gray-500 mb-1">小計（決済を除く）</div>
                          <div className="text-xl font-bold text-gray-900">{formatCurrency(subtotal)}</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border">
                          <div className="text-xs text-gray-500 mb-1">支払額（cost）</div>
                          {isSuperAdmin ? (
                            <div className="flex items-center gap-2">
                              <Input
                                className="text-left font-bold text-green-700"
                                inputMode="decimal"
                                value={costEditMap[String(s.id)] ?? String(Number(s.cost) || 0)}
                                onFocus={() =>
                                  setCostEditMap((prev) => ({
                                    ...prev,
                                    [String(s.id)]: prev[String(s.id)] ?? String(Number(s.cost) || 0),
                                  }))
                                }
                                onChange={(e) => setCostEditMap((prev) => ({ ...prev, [String(s.id)]: e.target.value }))}
                              />
                              <Button size="sm" variant="outline" disabled={isSaving} onClick={() => saveCost(s.id)}>
                                {isSaving ? '保存中…' : '保存'}
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xl font-bold text-green-700">{formatCurrency(Number(s.cost) || 0)}</div>
                          )}
                        </div>
                        <div className="p-4 bg-white rounded-lg border space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">開始時間</span>
                            <span className="font-medium">{formatDateTime(s.created_at)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">終了時間</span>
                            <span className="font-medium">{formatDateTime(s.end_at)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 flex items-center"><CreditCard className="w-4 h-4 mr-1" />支払い方法</span>
                            <span className="font-medium">{s.pay_type_label || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 flex items-center"><Users className="w-4 h-4 mr-1" />顧客人数</span>
                            <span className="font-medium">{formatNumber(Number(s.client) || 0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 右：内訳 */}
                      <div className="lg:col-span-2">
                        <div className="overflow-x-auto border rounded-lg bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-28">カテゴリー</TableHead>
                                <TableHead>名前</TableHead>
                                <TableHead className="text-right w-32">金額</TableHead>
                                <TableHead className="text-right w-20">数量</TableHead>
                                <TableHead className="text-right w-36">総金額</TableHead>
                                {isSuperAdmin ? <TableHead className="text-right w-28">保存</TableHead> : null}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {nonPaymentItems.map((it: any, idx: number) => {
                                const itemKey = String(it?.item_key || '');
                                const k = getEditKey(s.id, itemKey);
                                const row = editMap[k];
                                
                                // 指名の場合、キャスト名を取得
                                let displayName = it.name || '';
                                if (it.category === '指名' && castList.length > 0) {
                                  // item_keyやcast_idから該当するキャストを探す
                                  const castId = it.cast_id || it.nomination_id;
                                  const matchedCast = castList.find((c: any) => 
                                    c.cast_id === castId || 
                                    String(c.cast_id) === String(castId) ||
                                    String(c.nomination_id) === String(it.nomination_id)
                                  );
                                  if (matchedCast && matchedCast.cast_name) {
                                    displayName = `${it.name || '指名'}（${matchedCast.cast_name}）`;
                                  }
                                }
                                
                                // vip_room、song_room、bottle_keepの場合はカテゴリーを「サービス」に変更
                                const serviceTypes = ['vip_room', 'song_room', 'bottle_keep'];
                                const displayCategory = serviceTypes.includes(String(it.name || '')) ? 'サービス' : it.category;
                                
                                return (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{displayCategory}</TableCell>
                                  <TableCell>{displayName}</TableCell>
                                  <TableCell className="text-right">
                                    {isSuperAdmin && itemKey ? (
                                      <Input
                                        className="text-right"
                                        inputMode="decimal"
                                        value={row?.unit_price ?? String(it.unit_price ?? '')}
                                        onFocus={() => ensureEditRow(s.id, it)}
                                        onChange={(e) =>
                                          setEditMap((prev) => ({
                                            ...prev,
                                            [k]: { ...(prev[k] || { unit_price: '', quantity: '', total: '' }), unit_price: e.target.value }
                                          }))
                                        }
                                      />
                                    ) : (
                                      formatCurrency(Number(it.unit_price) || 0)
                                    )}
                                    {it?.unit_price_note ? <span className="ml-1 text-xs text-gray-600">{String(it.unit_price_note)}</span> : null}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {it.category === '指名' ? (
                                      '-'
                                    ) : isSuperAdmin && itemKey ? (
                                      <Input
                                        className="text-right"
                                        inputMode="numeric"
                                        value={row?.quantity ?? String(it.quantity ?? '')}
                                        onFocus={() => ensureEditRow(s.id, it)}
                                        onChange={(e) =>
                                          setEditMap((prev) => ({
                                            ...prev,
                                            [k]: { ...(prev[k] || { unit_price: '', quantity: '', total: '' }), quantity: e.target.value }
                                          }))
                                        }
                                      />
                                    ) : (
                                      formatNumber(Number(it.quantity) || 0)
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {isSuperAdmin && itemKey ? (
                                      <Input
                                        className="text-right font-medium"
                                        inputMode="decimal"
                                        value={row?.total ?? String(it.total ?? '')}
                                        onFocus={() => ensureEditRow(s.id, it)}
                                        onChange={(e) =>
                                          setEditMap((prev) => ({
                                            ...prev,
                                            [k]: { ...(prev[k] || { unit_price: '', quantity: '', total: '' }), total: e.target.value }
                                          }))
                                        }
                                      />
                                    ) : (
                                      formatCurrency(Number(it.total) || 0)
                                    )}
                                  </TableCell>
                                  {isSuperAdmin ? (
                                    <TableCell className="text-right">
                                      {itemKey ? (
                                        <Button size="sm" variant="outline" disabled={isSaving} onClick={() => saveOverride(s.id, it)}>
                                          {isSaving ? '保存中…' : '保存'}
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-gray-400">-</span>
                                      )}
                                    </TableCell>
                                  ) : null}
                                </TableRow>
                                );
                              })}
                              <TableRow>
                                <TableCell className="font-semibold">小計</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell className="text-right font-bold">{formatCurrency(subtotal)}</TableCell>
                                {isSuperAdmin ? <TableCell /> : null}
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-semibold">合計</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell className="text-right font-bold text-blue-600">{formatCurrency(subtotal * 1.1)}</TableCell>
                                {isSuperAdmin ? <TableCell /> : null}
                              </TableRow>
                              {/* {paymentItems.length > 0 && (
                                <TableRow>
                                  <TableCell className="font-semibold">決済合計</TableCell>
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell className="text-right font-bold">{formatCurrency(paymentTotal)}</TableCell>
                                  {isSuperAdmin ? <TableCell /> : null}
                                </TableRow>
                              )} */}
                            </TableBody>
                          </Table>
                        </div>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </RoleGate>
  );
}


