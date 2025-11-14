'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, Clock, CheckCircle, X, Users, ShoppingCart, 
  DollarSign, Calendar, User, Package, AlertCircle, ArrowLeft
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface SalesOrder {
  id: number;
  cast_id: number | null;
  product_id: number;
  amount: number;
  table_id: number;
  session_id: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  accepted_at: string | null;
  accepted_by: number | null;
  created_at: string;
  updated_at: string;
  cast_name: string | null;
  cast_email: string | null;
  product_name: string;
  sale_price: number;
  table_name: string;
}

interface ServiceOrder {
  id: number;
  cast_id: number | null;
  service_id: number;
  amount: number;
  table_id: number;
  session_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  accepted_at: string | null;
  accepted_by: number | null;
  created_at: string;
  updated_at: string;
  cast_name: string | null;
  cast_email: string | null;
  service_name: string;
  table_name: string;
}

export default function OrderMonitoringPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [servicePendingCount, setServicePendingCount] = useState(0);
  const { success, error } = useNotificationContext();
  const router = useRouter();

  useEffect(() => {
    loadSalesOrders();
    loadServiceOrders();
  }, []);

  // リアルタイム更新のためのポーリング（500ms間隔）
  useEffect(() => {
    const interval = setInterval(() => {
      loadSalesOrdersSilently();
      loadServiceOrdersSilently();
    }, 500); // 500msごとに更新
    return () => clearInterval(interval);
  }, []);

  const loadSalesOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/salesorder');
      const result = await response.json();
      
      if (result.success) {
        setSalesOrders(result.data);
        const pending = result.data.filter((order: SalesOrder) => order.status === 'pending');
        setPendingCount(pending.length);
      } else {
        error('エラー', '売上注文データの取得に失敗しました');
      }
    } catch (err) {
      console.error('売上注文取得エラー:', err);
      error('エラー', '売上注文データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadServiceOrders = async () => {
    try {
      const response = await fetch('/api/serviceorder');
      const result = await response.json();
      
      if (result.success) {
        setServiceOrders(result.data);
        const pending = result.data.filter((order: ServiceOrder) => order.status === 'pending');
        setServicePendingCount(pending.length);
      } else {
        error('エラー', 'サービス注文データの取得に失敗しました');
      }
    } catch (err) {
      console.error('サービス注文取得エラー:', err);
      error('エラー', 'サービス注文データの取得に失敗しました');
    }
  };

  // 静かな更新用の関数（ローディング状態を変更しない）
  const loadSalesOrdersSilently = async () => {
    try {
      const response = await fetch('/api/salesorder');
      const result = await response.json();
      
      if (result.success) {
        setSalesOrders(result.data);
        const pending = result.data.filter((order: SalesOrder) => order.status === 'pending');
        setPendingCount(pending.length);
      }
    } catch (err) {
      console.error('売上注文取得エラー（静かな更新）:', err);
    }
  };

  const loadServiceOrdersSilently = async () => {
    try {
      const response = await fetch('/api/serviceorder');
      const result = await response.json();
      
      if (result.success) {
        setServiceOrders(result.data);
        const pending = result.data.filter((order: ServiceOrder) => order.status === 'pending');
        setServicePendingCount(pending.length);
      }
    } catch (err) {
      console.error('サービス注文取得エラー（静かな更新）:', err);
    }
  };

  const handleAcceptRequest = async (orderId: number) => {
    try {
      console.log('受付処理開始:', { orderId, status: 'accepted' });
      
      const response = await fetch(`/api/salesorder/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'accepted',
          accepted_by: 1 // 管理者ID（実際の実装では認証されたユーザーIDを使用）
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('受付完了', '注文を受付ました');
        loadSalesOrders();
      } else {
        console.error('受付エラー詳細:', result);
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error || '注文の受付に失敗しました';
        error('エラー', errorMessage);
      }
    } catch (err) {
      console.error('注文受付エラー:', err);
      error('エラー', `注文の受付に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const handleRejectRequest = async (orderId: number) => {
    try {
      const response = await fetch(`/api/salesorder/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          accepted_by: 1 // 管理者ID
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('拒否完了', '注文を拒否しました');
        loadSalesOrders();
      } else {
        console.error('拒否エラー詳細:', result);
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error || '注文の拒否に失敗しました';
        error('エラー', errorMessage);
      }
    } catch (err) {
      console.error('注文拒否エラー:', err);
      error('エラー', `注文の拒否に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const handleAcceptServiceRequest = async (orderId: number) => {
    try {
      console.log('サービス受付処理開始:', { orderId, status: 'accepted' });
      
      const response = await fetch(`/api/serviceorder/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'accepted',
          accepted_by: 1 // 管理者ID（実際の実装では認証されたユーザーIDを使用）
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('受付完了', 'サービス注文を受付ました');
        loadServiceOrders();
      } else {
        console.error('サービス受付エラー詳細:', result);
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error || 'サービス注文の受付に失敗しました';
        error('エラー', errorMessage);
      }
    } catch (err) {
      console.error('サービス注文受付エラー:', err);
      error('エラー', `サービス注文の受付に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const handleRejectServiceRequest = async (orderId: number) => {
    try {
      const response = await fetch(`/api/serviceorder/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          accepted_by: 1 // 管理者ID
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('拒否完了', 'サービス注文を拒否しました');
        loadServiceOrders();
      } else {
        console.error('サービス拒否エラー詳細:', result);
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error || 'サービス注文の拒否に失敗しました';
        error('エラー', errorMessage);
      }
    } catch (err) {
      console.error('サービス注文拒否エラー:', err);
      error('エラー', `サービス注文の拒否に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">待機中</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">受付済み</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">拒否</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleReturn = () => {
    router.push('/dashboard');
  };

  const pendingOrders = salesOrders.filter(order => order.status === 'pending');
  const allOrders = salesOrders;
  const pendingServiceOrders = serviceOrders.filter(order => order.status === 'pending');
  const allServiceOrders = serviceOrders;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReturn}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>戻る</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">注文監視</h1>
            <p className="text-gray-600">テーブルからの注文リクエストを管理します</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {(pendingCount > 0 || servicePendingCount > 0) && (
            <div className="relative">
              <Bell className="w-6 h-6 text-red-500 animate-pulse" />
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount + servicePendingCount}
              </div>
            </div>
          )}
           <Button onClick={() => { loadSalesOrders(); loadServiceOrders(); }} variant="outline">
             <Clock className="w-4 h-4 mr-2" />
             更新
           </Button>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" className="relative">
            製品注文リスト
            {pendingCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="services" className="relative">
            サービス注文リスト
            {servicePendingCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {servicePendingCount}
              </div>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {/* 新規注文リクエスト */}
          {pendingOrders.length > 0 && (
            <Card className="border-orange-300 border-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                  新規注文リクエスト
                </CardTitle>
                <CardDescription>
                  受付待ちの注文リクエスト一覧
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>テーブル名</TableHead>
                        <TableHead>キャスト名</TableHead>
                        <TableHead>製品情報</TableHead>
                        <TableHead>注文数量</TableHead>
                        <TableHead>注文時間</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead className="text-center">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOrders.map((order) => (
                        <TableRow key={order.id} className="bg-orange-50">
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">{order.table_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.cast_name ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{order.cast_name}</span>
                                {order.cast_email && (
                                  <span className="text-xs text-gray-500">{order.cast_email}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.product_name}</span>
                              <span className="text-sm text-gray-500">
                                ¥{order.unit_price.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Package className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="font-medium">{order.amount}個</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm">{formatDateTime(order.created_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptRequest(order.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                受付
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectRequest(order.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4 mr-1" />
                                拒否
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 全注文リクエスト */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                全注文リクエスト
              </CardTitle>
              <CardDescription>
                すべての注文リクエスト履歴
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                  <p className="text-gray-500">読み込み中...</p>
                </div>
              ) : allOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>注文リクエストがありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>テーブル名</TableHead>
                        <TableHead>キャスト名</TableHead>
                        <TableHead>製品情報</TableHead>
                        <TableHead>注文数量</TableHead>
                        <TableHead>注文時間</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>受付時間</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">{order.table_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.cast_name ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{order.cast_name}</span>
                                {order.cast_email && (
                                  <span className="text-xs text-gray-500">{order.cast_email}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.product_name}</span>
                              <span className="text-sm text-gray-500">
                                ¥{order.unit_price.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Package className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="font-medium">{order.amount}個</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm">{formatDateTime(order.created_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell>
                            {order.accepted_at ? (
                              <span className="text-sm">{formatDateTime(order.accepted_at)}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          {/* 新規サービス注文リクエスト */}
          {pendingServiceOrders.length > 0 && (
            <Card className="border-orange-300 border-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                  新規サービス注文リクエスト
                </CardTitle>
                <CardDescription>
                  受付待ちのサービス注文リクエスト一覧
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>テーブル名</TableHead>
                        <TableHead>キャスト名</TableHead>
                        <TableHead>サービス名</TableHead>
                        <TableHead>注文数量</TableHead>
                        <TableHead>注文時間</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead className="text-center">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingServiceOrders.map((order) => (
                        <TableRow key={order.id} className="bg-orange-50">
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">{order.table_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.cast_name ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{order.cast_name}</span>
                                {order.cast_email && (
                                  <span className="text-xs text-gray-500">{order.cast_email}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.service_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Package className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="font-medium">{order.amount}個</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm">{formatDateTime(order.created_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptServiceRequest(order.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                受付
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectServiceRequest(order.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4 mr-1" />
                                拒否
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 全サービス注文リクエスト */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                全サービス注文リクエスト
              </CardTitle>
              <CardDescription>
                すべてのサービス注文リクエスト履歴
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                  <p className="text-gray-500">読み込み中...</p>
                </div>
              ) : allServiceOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>サービス注文リクエストがありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>テーブル名</TableHead>
                        <TableHead>キャスト名</TableHead>
                        <TableHead>サービス名</TableHead>
                        <TableHead>注文数量</TableHead>
                        <TableHead>注文時間</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>受付時間</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allServiceOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">{order.table_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.cast_name ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{order.cast_name}</span>
                                {order.cast_email && (
                                  <span className="text-xs text-gray-500">{order.cast_email}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.service_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Package className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="font-medium">{order.amount}個</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm">{formatDateTime(order.created_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell>
                            {order.accepted_at ? (
                              <span className="text-sm">{formatDateTime(order.accepted_at)}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}




