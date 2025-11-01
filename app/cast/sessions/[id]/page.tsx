'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Users, Clock, Wine, Plus,
  CreditCard, User, Calendar, CheckCircle, AlertCircle
} from 'lucide-react';
import { 
  mockOrders, mockTables, mockCustomers, mockStaff,
  formatCurrency, formatDateTime, ServiceSession, Order
} from '@/lib/mock-data';
import { useSession } from '@/lib/session-context';


export default function CastSessionDetailPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { sessions } = useSession();
  const session = sessions.find(s => s.id === sessionId) || null;

  useEffect(() => {
    // セッションの注文を取得
    if (session) {
      const sessionOrders = mockOrders.filter(o => o.session_id === session.id);
      setOrders(sessionOrders);
    }
    
    setIsLoading(false);
  }, [session]);

  const getTableInfo = () => {
    if (!session) return null;
    return mockTables.find(t => t.id === session.table_seat_id);
  };

  const getCustomerInfo = () => {
    if (!session?.customer_id) return null;
    return mockCustomers.find(c => c.id === session.customer_id);
  };

  const getPrimaryCast = () => {
    if (!session?.participating_casts) return null;
    const primaryCast = session.participating_casts.find(cast => cast.is_primary && !cast.left_at);
    if (!primaryCast) return null;
    return mockStaff.find(s => s.id === primaryCast.staff_id);
  };

  const getActiveCasts = () => {
    if (!session?.participating_casts) return [];
    return session.participating_casts
      .filter(cast => !cast.left_at)
      .map(cast => ({
        ...cast,
        staff: mockStaff.find(s => s.id === cast.staff_id)
      }))
      .filter(cast => cast.staff);
  };


  const cancelItem = (itemId: string) => {
    if (!confirm('この商品をキャンセルしますか？')) return;

    // 注文アイテムのキャンセル処理（モック）
    setOrders(orders.map(order => ({
      ...order,
      items: order.items.map(item => 
        item.id === itemId 
          ? { ...item, canceled: true }
          : item
      )
    })));

    console.log('注文アイテムキャンセル:', itemId);
  };

  const proceedToCheckout = () => {
    const activeOrder = orders.find(o => o.status === 'confirmed');
    if (activeOrder) {
      router.push(`/staff/checkout?order=${activeOrder.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">セッションが見つかりません</h2>
          <Button onClick={() => router.push('/staff/tables')}>
            テーブル一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const table = getTableInfo();
  const customer = getCustomerInfo();
  const primaryCast = getPrimaryCast();
  const activeCasts = getActiveCasts();
  const sessionDuration = Math.floor((new Date().getTime() - new Date(session.opened_at).getTime()) / (1000 * 60));
  const totalAmount = orders.reduce((sum, order) => sum + order.total_yen, 0);

  return (
    <RoleGate allowedRoles={['cast', 'admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/staff/tables')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  テーブル一覧
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {table?.label} - セッション詳細
                  </h1>
                  <p className="text-sm text-gray-500">
                    {customer?.display_name || '一般顧客'} - {sessionDuration}分経過
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  接客中
                </Badge>
                <Button 
                  onClick={() => window.open(`/kiosk/${session.table_seat_id}`, '_blank')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Kioskで注文
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* セッション情報 */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <User className="w-5 h-5 mr-2" />
                    セッション情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-700">テーブル</span>
                    <span className="font-medium text-blue-900">{table?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">顧客</span>
                    <span className="font-medium text-blue-900">
                      {customer?.display_name || '一般顧客'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">メインキャスト</span>
                    <span className="font-medium text-blue-900">
                      {primaryCast?.name || '未指名'}
                    </span>
                  </div>
                  {activeCasts.length > 1 && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">参加キャスト</span>
                      <span className="font-medium text-blue-900">
                        {activeCasts.length}名
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-blue-700">開始時刻</span>
                    <span className="font-medium text-blue-900">
                      {formatDateTime(session.opened_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">経過時間</span>
                    <span className="font-medium text-blue-900">{sessionDuration}分</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <CreditCard className="w-5 h-5 mr-2" />
                    会計サマリー
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900 mb-2">
                      {formatCurrency(totalAmount)}
                    </div>
                    <p className="text-sm text-green-700">現在の合計金額</p>
                    <Button 
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                      onClick={proceedToCheckout}
                      disabled={orders.length === 0}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      会計処理
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 注文詳細 */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>注文詳細</CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wine className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">注文がありません</h3>
                      <p className="text-gray-500 mb-6">商品を追加してください</p>
                      <Button 
                        onClick={() => window.open(`/kiosk/${session.table_seat_id}`, '_blank')}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Kioskで注文
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => (
                        <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h4 className="font-medium">注文 #{order.id.slice(-6)}</h4>
                              <p className="text-sm text-gray-500">
                                {formatDateTime(order.created_at)}
                              </p>
                            </div>
                            <Badge className={
                              order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              order.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {order.status === 'confirmed' ? '確定' :
                               order.status === 'draft' ? '下書き' : order.status}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            {order.items.map((item) => (
                              <div key={item.id} className={`p-3 rounded-lg ${item.canceled ? 'bg-red-50 opacity-60' : 'bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <span className={`font-medium ${item.canceled ? 'line-through text-gray-500' : ''}`}>
                                        {item.menu_item.name}
                                      </span>
                                      <span className="text-sm text-gray-500">× {item.qty}</span>
                                      {item.canceled && (
                                        <Badge variant="destructive" className="text-xs">
                                          キャンセル済
                                        </Badge>
                                      )}
                                    </div>
                                    {item.note && (
                                      <p className="text-sm text-gray-600 mt-1">備考: {item.note}</p>
                                    )}
                                    {item.cast_id && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        担当: {mockStaff.find(s => s.id === item.cast_id)?.name}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <span className={`font-medium ${item.canceled ? 'line-through text-gray-500' : 'text-purple-600'}`}>
                                      {formatCurrency(item.line_subtotal_yen)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="border-t mt-4 pt-4 flex justify-between items-center">
                            <span className="font-semibold">注文合計</span>
                            <span className="text-lg font-bold text-purple-600">
                              {formatCurrency(order.total_yen)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}