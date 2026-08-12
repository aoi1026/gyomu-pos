'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Phone, Clock, CheckCircle, XCircle, AlertTriangle,
  Users, MessageSquare, Calendar, Filter
} from 'lucide-react';
import { 
  mockStaffCalls, mockServiceOrders, getCallTypeLabel, getServiceTypeLabel,
  getPriorityLabel, getPriorityColor, StaffCall, ServiceOrder
} from '@/lib/staff-call-system';
import { formatDateTime } from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';

export default function StaffCallsPage() {
  const [staffCalls, setStaffCalls] = useState<StaffCall[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [managerCalls, setManagerCalls] = useState<any[]>([]);
  const [pendingServiceOrderCount, setPendingServiceOrderCount] = useState(0);
  const [pendingManagerCallCount, setPendingManagerCallCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastManagerCallCount, setLastManagerCallCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>(new Date().toISOString());
  const [isUpdating, setIsUpdating] = useState(false);
  const [newCallIds, setNewCallIds] = useState<Set<string>>(new Set());
  
  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    loadData();
  }, [selectedDate, statusFilter]);

  // リアルタイム更新のためのポーリング（500ms間隔）
  useEffect(() => {
    const interval = setInterval(() => {
      loadDataSilently();
    }, 500); // 500msごとに更新

    return () => clearInterval(interval);
  }, [selectedDate, statusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // スタッフ呼び出しデータを取得
      const managerCallsResponse = await fetch('/api/callmanager');
      const managerCallsResult = await managerCallsResponse.json();
      
      if (managerCallsResult.success) {
        const filteredManagerCalls = managerCallsResult.data.filter((call: any) => {
          const callDate = (call.created_at || '').split('T')[0];
          const matchesDate = !selectedDate || callDate === selectedDate;
          const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
          return matchesDate && matchesStatus;
        });
        setManagerCalls(filteredManagerCalls);
        
        // スタッフ呼び出しの通知数を計算
        const pendingManagerCalls = managerCallsResult.data.filter((call: any) => call.status === 'pending');
        const currentPendingCount = pendingManagerCalls.length;
        
        // 新しいスタッフ呼び出しリクエストを検出
        if (currentPendingCount > lastManagerCallCount && lastManagerCallCount > 0) {
          const newCalls = pendingManagerCalls.slice(0, currentPendingCount - lastManagerCallCount);
          newCalls.forEach((call: any) => {
            success('新しいスタッフ呼び出し', `${call.cast_name}から${call.table_name}へのスタッフ呼び出しリクエストが届きました`);
          });
        }
        
        setPendingManagerCallCount(currentPendingCount);
        setLastManagerCallCount(currentPendingCount);
      } else {
        setManagerCalls([]);
        setPendingManagerCallCount(0);
      }
    } catch (err) {
      console.error('スタッフ呼び出しデータ取得エラー:', err);
      setManagerCalls([]);
    }

    try {
      // 通知データを取得
      const notificationsResponse = await fetch('/api/notifications?type=manager_call&status=unread');
      const notificationsResult = await notificationsResponse.json();
      
      if (notificationsResult.success) {
        setNotifications(notificationsResult.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('通知データ取得エラー:', err);
      setNotifications([]);
    }
    
    // モックデータをフィルタリング
    const filteredCalls = mockStaffCalls.filter(call => {
      const callDate = call.created_at.split('T')[0];
      const matchesDate = callDate === selectedDate;
      const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
      return matchesDate && matchesStatus;
    });
    
    const filteredOrders = mockServiceOrders.filter(order => {
      const orderDate = order.created_at.split('T')[0];
      const matchesDate = orderDate === selectedDate;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesDate && matchesStatus;
    });
    
    // サービス注文の通知数を計算
    const pendingServiceOrders = mockServiceOrders.filter(order => order.status === 'pending');
    setPendingServiceOrderCount(pendingServiceOrders.length);
    
    setStaffCalls(filteredCalls);
    setServiceOrders(filteredOrders);
    setIsLoading(false);
  };

  const loadDataSilently = async () => {
    try {
      setIsUpdating(true);
      
      // スタッフ呼び出しデータを取得（ローディング状態を変更しない）
      const managerCallsResponse = await fetch('/api/callmanager');
      const managerCallsResult = await managerCallsResponse.json();
      
      if (managerCallsResult.success) {
        const filteredManagerCalls = managerCallsResult.data.filter((call: any) => {
          const callDate = (call.created_at || '').split('T')[0];
          const matchesDate = !selectedDate || callDate === selectedDate;
          const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
          return matchesDate && matchesStatus;
        });
        
        // 新しいスタッフ呼び出しリクエストを検出（タイムスタンプベース）
        const newCalls = managerCallsResult.data.filter((call: any) => {
          const callTime = new Date(call.created_at).getTime();
          const lastTime = new Date(lastUpdateTime).getTime();
          return callTime > lastTime && call.status === 'pending';
        });
        
        if (newCalls.length > 0) {
          const newCallIdSet = new Set<string>(newCalls.map((call: any) => call.id.toString()));
          
          // 新しいリクエストをハイライト（モーダル通知は表示しない）
          setNewCallIds(newCallIdSet);
          
          // 3秒後にハイライトを削除
          setTimeout(() => {
            setNewCallIds(new Set());
          }, 3000);
          
          setLastUpdateTime(new Date().toISOString());
        }
        
        const pendingManagerCalls = managerCallsResult.data.filter((call: any) => call.status === 'pending');
        const currentPendingCount = pendingManagerCalls.length;
        
        setManagerCalls(filteredManagerCalls);
        setPendingManagerCallCount(currentPendingCount);
        setLastManagerCallCount(currentPendingCount);
      }
      
      // 短い遅延後にアニメーション状態をリセット
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    } catch (err) {
      console.error('サイレント更新エラー:', err);
      setIsUpdating(false);
    }
  };

  const acknowledgeCall = async (callId: string) => {
    setStaffCalls(staffCalls.map(call => 
      call.id === callId 
        ? { 
            ...call, 
            status: 'acknowledged', 
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: 'current-staff'
          }
        : call
    ));
    success('呼び出しを承認しました', 'スタッフに通知されました');
  };

  const completeCall = async (callId: string) => {
    setStaffCalls(staffCalls.map(call => 
      call.id === callId 
        ? { 
            ...call, 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            completed_by: 'current-staff'
          }
        : call
    ));
    success('呼び出しを完了しました', '対応が完了しました');
  };

  const completeServiceOrder = async (orderId: string) => {
    setServiceOrders(serviceOrders.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            completed_by: 'current-staff'
          }
        : order
    ));
    success('サービス注文を完了しました', '対応が完了しました');
  };

  const handleManagerCallAction = async (callId: string, action: 'accepted' | 'rejected') => {
    try {
      const response = await fetch(`/api/callmanager/${callId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action,
          accepted_by: 1 // 管理者ID（実際の実装では認証されたユーザーのIDを使用）
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // ローカル状態を更新
        setManagerCalls(managerCalls.map(call => 
          call.id === callId 
            ? { 
                ...call, 
                status: action, 
                accepted_at: result.data.accepted_at,
                accepted_by: result.data.accepted_by
              }
            : call
        ));
        
        success(
          action === 'accepted' ? 'スタッフ呼び出しを承認しました' : 'スタッフ呼び出しを拒否しました',
          action === 'accepted' ? '対応いたします' : '別の方法でお問い合わせください'
        );
      } else {
        error('エラー', result.error || '処理に失敗しました');
      }
    } catch (err) {
      console.error('スタッフ呼び出し処理エラー:', err);
      error('エラー', '処理に失敗しました');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '待機中', color: 'bg-yellow-100 text-yellow-800' },
      acknowledged: { label: '承認済み', color: 'bg-blue-100 text-blue-800' },
      completed: { label: '完了', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' },
      in_progress: { label: '対応中', color: 'bg-orange-100 text-orange-800' },
      accepted: { label: '承認済み', color: 'bg-green-100 text-green-800' },
      rejected: { label: '拒否済み', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

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
                  <div className="flex items-center space-x-2">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">スタッフ呼び出し管理</h1>
                    {(pendingServiceOrderCount + pendingManagerCallCount) > 0 && (
                      <Badge className="bg-red-500 text-white text-xs">
                        新規 {pendingServiceOrderCount + pendingManagerCallCount}件
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">呼び出し・サービス注文の管理</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* フィルター */}
          <div className="mb-6">
            {/* <div className="flex space-x-4">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="2025-01-20">2025年1月20日</option>
                <option value="2025-01-19">2025年1月19日</option>
                <option value="2025-01-18">2025年1月18日</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">全て</option>
                <option value="pending">待機中</option>
                <option value="acknowledged">承認済み</option>
                <option value="completed">完了</option>
              </select>
            </div> */}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* スタッフ呼び出し */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  スタッフ呼び出し
                </CardTitle>
              </CardHeader>
              <CardContent>
                  {staffCalls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      呼び出しがありません
                    </div>
                  ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">優先度</TableHead>
                          <TableHead className="w-[120px]">テーブル</TableHead>
                          <TableHead className="w-[120px]">呼び出し種別</TableHead>
                          <TableHead className="w-[200px]">メッセージ</TableHead>
                          <TableHead className="w-[100px]">ステータス</TableHead>
                          <TableHead className="w-[150px]">作成日時</TableHead>
                          <TableHead className="w-[150px]">アクション</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffCalls.map((call) => (
                          <TableRow key={call.id}>
                            <TableCell>
                            <Badge className={getPriorityColor(call.priority)}>
                              {getPriorityLabel(call.priority)}
                            </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {call.table_label}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                                <span>{getCallTypeLabel(call.call_type)}</span>
                          </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-gray-600">{call.message}</p>
                            </TableCell>
                            <TableCell>
                          {getStatusBadge(call.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDateTime(call.created_at)}
                          </div>
                            </TableCell>
                            <TableCell>
                        {call.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => acknowledgeCall(call.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              承認
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => completeCall(call.id)}
                            >
                              完了
                            </Button>
                          </div>
                        )}
                        {call.status === 'acknowledged' && (
                          <Button 
                            size="sm" 
                            onClick={() => completeCall(call.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            完了
                          </Button>
                        )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                      </div>
                  )}
              </CardContent>
            </Card> */}

            {/* サービス注文 */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  サービス注文
                </CardTitle>
              </CardHeader>
              <CardContent>
                  {serviceOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      サービス注文がありません
                    </div>
                  ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">テーブル</TableHead>
                          <TableHead className="w-[150px]">サービス種別</TableHead>
                          <TableHead className="w-[80px]">数量</TableHead>
                          <TableHead className="w-[200px]">備考</TableHead>
                          <TableHead className="w-[100px]">ステータス</TableHead>
                          <TableHead className="w-[150px]">作成日時</TableHead>
                          <TableHead className="w-[100px]">アクション</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.table_label}
                            </TableCell>
                            <TableCell>
                            <span className="font-medium">{getServiceTypeLabel(order.service_type)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-600">×{order.quantity}</span>
                            </TableCell>
                            <TableCell>
                          {order.note && (
                            <p className="text-sm text-gray-600">{order.note}</p>
                          )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDateTime(order.created_at)}
                          </div>
                            </TableCell>
                            <TableCell>
                        {order.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => completeServiceOrder(order.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            完了
                          </Button>
                        )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card> */}

            {/* リアルタイム通知 */}
            {notifications.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    新着通知
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {notification.cast_name} - {notification.table_label}
                            </div>
                            <div className="text-sm text-gray-600">{notification.message}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(notification.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

             {/* スタッフ呼び出し */}
             <Card className={`transition-all duration-300 ${isUpdating ? 'bg-blue-50 border-blue-200' : ''}`}>
               <CardHeader>
                 <CardTitle className="flex items-center justify-between">
                   <div className="flex items-center">
                     <AlertTriangle className="w-5 h-5 mr-2" />
                     新規リクエストリスト
                     {isUpdating && (
                       <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                     )}
                   </div>
                   {managerCalls.filter(call => call.status === 'pending').length > 0 && (
                     <Badge className="bg-red-500 text-white">
                       新規 {managerCalls.filter(call => call.status === 'pending').length}件
                     </Badge>
                   )}
                 </CardTitle>
               </CardHeader>
              <CardContent>
                {managerCalls.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div>新規リクエストがありません</div>
                    <div className="text-xs text-gray-400 mt-2">
                      選択日: {selectedDate} | ステータス: {statusFilter}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">キャスト名</TableHead>
                          <TableHead className="w-[120px]">テーブル名</TableHead>
                          <TableHead className="w-[120px]">呼び出し対象</TableHead>
                          <TableHead className="w-[100px]">ステータス</TableHead>
                          <TableHead className="w-[150px]">作成日時</TableHead>
                          <TableHead className="w-[200px]">アクション</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerCalls
                          .filter(call => call.status === 'pending')
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((call) => (
                           <TableRow 
                             key={call.id} 
                             className={`transition-all duration-500 ${
                              newCallIds.has(call.id.toString()) ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-yellow-50'
                             }`}
                           >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                <span>{call.cast_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                <span>{call.table_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {call.calltype === 'manager' ? 'スタッフ' : 
                                 call.calltype === 'service' ? 'サービス' :
                                 call.calltype === 'security' ? 'セキュリティ' :
                                 call.calltype === 'emergency' ? '緊急' : call.calltype}
                              </span>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(call.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDateTime(call.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {call.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleManagerCallAction(call.id, 'accepted')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    承認
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleManagerCallAction(call.id, 'rejected')}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    拒否
                                  </Button>
                                </div>
                              ) : call.status === 'accepted' ? (
                                <div className="flex items-center text-sm text-green-700">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  <span className="font-medium">承認済み</span>
                                </div>
                              ) : call.status === 'rejected' ? (
                                <div className="flex items-center text-sm text-red-700">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  <span className="font-medium">拒否済み</span>
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                </div>
                )}
              </CardContent>
            </Card>
            
            {/* 履歴（承認・拒否済み） */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  履歴（承認・拒否済み）
                </CardTitle>
              </CardHeader>
              <CardContent>
                {managerCalls.filter(call => call.status !== 'pending').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    履歴がありません
                  </div>
                ) : (
                  <div className="max-h-[50vh] overflow-y-auto pr-1">
                    <div className="overflow-x-auto">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">キャスト名</TableHead>
                          <TableHead className="w-[120px]">テーブル名</TableHead>
                          <TableHead className="w-[120px]">呼び出し対象</TableHead>
                          <TableHead className="w-[100px]">ステータス</TableHead>
                          <TableHead className="w-[150px]">作成日時</TableHead>
                          <TableHead className="w-[150px]">処理日時</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerCalls
                          .filter(call => call.status !== 'pending')
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((call) => (
                            <TableRow key={call.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4 text-blue-600" />
                                  <span>{call.cast_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                                  <span>{call.table_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  {call.calltype === 'manager' ? 'スタッフ' : 
                                   call.calltype === 'service' ? 'サービス' :
                                   call.calltype === 'security' ? 'セキュリティ' :
                                   call.calltype === 'emergency' ? '緊急' : call.calltype}
                                </span>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(call.status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDateTime(call.created_at)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {call.accepted_at ? formatDateTime(call.accepted_at) : '-'}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
