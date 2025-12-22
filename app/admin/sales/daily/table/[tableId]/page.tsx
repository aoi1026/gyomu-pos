'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function DailyTableDetailPage({ params }: { params: { tableId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const tableId = Number(params.tableId);

  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['admin', 'superadmin']}>
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
                          <div className="text-xl font-bold text-green-700">{formatCurrency(Number(s.cost) || 0)}</div>
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
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {nonPaymentItems.map((it: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{it.category}</TableCell>
                                  <TableCell>{it.name}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(Number(it.unit_price) || 0)}
                                    {it?.unit_price_note ? <span className="ml-1 text-xs text-gray-600">{String(it.unit_price_note)}</span> : null}
                                  </TableCell>
                                  <TableCell className="text-right">{it.category === '指名' ? '-' : formatNumber(Number(it.quantity) || 0)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(Number(it.total) || 0)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-semibold">小計</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell className="text-right font-bold">{formatCurrency(subtotal)}</TableCell>
                              </TableRow>

                              {paymentItems.length > 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="bg-gray-50 text-sm font-semibold text-gray-700">
                                    決済
                                  </TableCell>
                                </TableRow>
                              )}

                              {paymentItems.map((it: any, idx: number) => (
                                <TableRow key={`pay-${idx}`}>
                                  <TableCell className="font-medium">{it.category}</TableCell>
                                  <TableCell>{it.name}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(Number(it.unit_price) || 0)}
                                    {it?.unit_price_note ? <span className="ml-1 text-xs text-gray-600">{String(it.unit_price_note)}</span> : null}
                                  </TableCell>
                                  <TableCell className="text-right">{formatNumber(Number(it.quantity) || 0)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(Number(it.total) || 0)}</TableCell>
                                </TableRow>
                              ))}

                              {paymentItems.length > 0 && (
                                <TableRow>
                                  <TableCell className="font-semibold">決済合計</TableCell>
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell className="text-right font-bold">{formatCurrency(paymentTotal)}</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* 指名キャスト一覧 */}
                        <div className="mt-4 border rounded-lg bg-white p-4">
                          <div className="text-sm font-semibold text-gray-900 mb-2">指名キャスト一覧</div>
                          {castList.length === 0 ? (
                            <div className="text-sm text-gray-500">指名なし</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {castList.map((c: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-900">
                                  {c.cast_name ? `${c.cast_name} (#${c.cast_id})` : `#${c.cast_id}`} / {c.type_id}
                                </Badge>
                              ))}
                            </div>
                          )}
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


