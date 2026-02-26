'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, TrendingUp, FileText, Users } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

export default function CastDailyPerformancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>({ main_count: 0, inside_count: 0, together_count: 0, total_sales: 0, products: [] });

  useEffect(() => {
    // 新しいキャスト認証を優先
    const castAuth = typeof window !== 'undefined' ? localStorage.getItem('cast_auth') : null;
    if (castAuth) {
      try {
        const parsed = JSON.parse(castAuth);
        setUser(parsed);
        return;
      } catch (e) {
        localStorage.removeItem('cast_auth');
      }
    }
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/cast-login');
      return;
    }
    setUser(currentUser);
  }, [router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cast/performance/daily?user_id=${user.id}&date=${selectedDate}`);
        const result = await res.json();
        if (result.success) setData(result.data);
        else setData({ main_count: 0, inside_count: 0, together_count: 0, total_sales: 0, products: [] });
      } catch (e) {
        setData({ main_count: 0, inside_count: 0, together_count: 0, total_sales: 0, products: [] });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, selectedDate]);

  return (
    <RoleGate allowedRoles={['cast', 'admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/cast/dashboard')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />戻る
                </Button>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">本日の実績</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <Label htmlFor="date">対象日</Label>
                </div>
                <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-48" />
              </div>
            </CardContent>
          </Card>

          {(!user || isLoading) ? (
            <div className="min-h-[200px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-blue-800"><TrendingUp className="w-5 h-5 mr-2" />本指名数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">{data.main_count}件</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-green-800"><TrendingUp className="w-5 h-5 mr-2" />場内指名数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">{data.inside_count}件</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-purple-800"><Users className="w-5 h-5 mr-2" />同伴数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-900">{data.together_count}件</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><FileText className="w-5 h-5 mr-2" />本日の注文（キャスト別）</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>商品名</TableHead>
                          <TableHead className="text-right">数量</TableHead>
                          <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.products || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-gray-500">データがありません</TableCell>
                          </TableRow>
                        ) : (
                          data.products.map((p: any) => (
                            <TableRow key={p.product_id}>
                              <TableCell>{p.product_name}</TableCell>
                              <TableCell className="text-right">{p.quantity}</TableCell>
                              <TableCell className="text-right">{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Number(p.total_amount || 0))}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}


