'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Bell, Clock, CheckCircle, XCircle, AlertTriangle,
  Users, MessageSquare, Calendar, Filter, Eye, User
} from 'lucide-react';
import { 
  mockOrderNotifications, mockStaffAssignments, getPriorityLabel, getPriorityColor,
  getOrderTypeLabel, getOrderTypeIcon, OrderNotification, StaffAssignment
} from '@/lib/order-monitoring-system';
import { formatDateTime } from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';

export default function OrderMonitorPage() {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2025-01-20');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    loadData();
  }, [selectedDate, statusFilter, priorityFilter]);

  const loadData = async () => {
    setIsLoading(true);
    
    // モックデータをフィルタリング
    const filteredNotifications = mockOrderNotifications.filter(notification => {
      const notificationDate = notification.created_at.split('T')[0];
      const matchesDate = notificationDate === selectedDate;
      const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
      return matchesDate && matchesStatus && matchesPriority;
    });
    
    setNotifications(filteredNotifications);
    setStaffAssignments(mockStaffAssignments);
    setIsLoading(false);
  };

  const acknowledgeNotification = async (notificationId: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { 
            ...notification, 
            status: 'acknowledged', 
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: 'current-staff'
          }
        : notification
    ));
    success('通知を承認しました', '担当者に割り当てられました');
  };

  const completeNotification = async (notificationId: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { 
            ...notification, 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            completed_by: 'current-staff'
          }
        : notification
    ));
    success('通知を完了しました', '対応が完了しました');
  };

  const assignToStaff = async (notificationId: string, staffId: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { 
            ...notification, 
            assigned_to: staffId,
            status: 'acknowledged',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: staffId
          }
        : notification
    ));
    success('担当者を割り当てました', 'スタッフに通知されました');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '待機中', color: 'bg-yellow-100 text-yellow-800' },
      acknowledged: { label: '承認済み', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: '対応中', color: 'bg-orange-100 text-orange-800' },
      completed: { label: '完了', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStaffName = (staffId: string) => {
    const staff = staffAssignments.find(s => s.staff_id === staffId);
    return staff?.staff_name || '不明';
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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">注文監視システム</h1>
                  <p className="text-xs sm:text-sm text-gray-500">リアルタイム注文・サービス監視</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* フィルター */}
          <div className="mb-6">
            <div className="flex space-x-4">
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
                <option value="all">全てのステータス</option>
                <option value="pending">待機中</option>
                <option value="acknowledged">承認済み</option>
                <option value="in_progress">対応中</option>
                <option value="completed">完了</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">全ての優先度</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">緊急</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 注文通知一覧 */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    注文・サービス通知
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        通知がありません
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div key={notification.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{getOrderTypeIcon(notification.order_type)}</span>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{notification.table_label}</span>
                                  <Badge className={getPriorityColor(notification.priority)}>
                                    {getPriorityLabel(notification.priority)}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600">
                                  {getOrderTypeLabel(notification.order_type)}
                                </div>
                              </div>
                            </div>
                            {getStatusBadge(notification.status)}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm text-gray-800">{notification.message}</p>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDateTime(notification.created_at)}
                              {notification.estimated_time && (
                                <span className="ml-2">
                                  予想時間: {notification.estimated_time}分
                                </span>
                              )}
                            </div>
                            {notification.assigned_to && (
                              <div className="flex items-center text-xs text-blue-600">
                                <User className="w-3 h-3 mr-1" />
                                担当: {getStaffName(notification.assigned_to)}
                              </div>
                            )}
                          </div>
                          
                          {notification.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => acknowledgeNotification(notification.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                承認
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => completeNotification(notification.id)}
                              >
                                完了
                              </Button>
                            </div>
                          )}
                          
                          {notification.status === 'acknowledged' && (
                            <Button 
                              size="sm" 
                              onClick={() => completeNotification(notification.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              完了
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* スタッフ状況 */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    スタッフ状況
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {staffAssignments.map((staff) => (
                      <div key={staff.staff_id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{staff.staff_name}</span>
                          <Badge 
                            variant={staff.is_available ? "default" : "secondary"}
                            className={staff.is_available ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                          >
                            {staff.is_available ? '稼働中' : '休憩中'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>役割:</span>
                            <span>{staff.role}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>現在の注文:</span>
                            <span>{staff.current_orders}/{staff.max_orders}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full"
                              style={{ width: `${(staff.current_orders / staff.max_orders) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
