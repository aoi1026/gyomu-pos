'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Eye, Calendar, CreditCard, Wine, Receipt, 
  Clock, Star, MapPin, TrendingUp, User,
  ShoppingCart, Utensils, Phone, Mail
} from 'lucide-react';
import { 
  Customer, mockOrders, mockSessions, mockBottles, mockMenuItems,
  formatCurrency, formatDateTime, Order, ServiceSession, Bottle
} from '@/lib/mock-data';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

interface CustomerStats {
  totalVisits: number;
  totalSpent: number;
  averageSpent: number;
  lastVisit: string;
  favoriteItems: { name: string; count: number }[];
  totalBottles: number;
  activeBottles: number;
}

export function CustomerHistoryModal({ isOpen, onClose, customer }: CustomerHistoryModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<ServiceSession[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);

  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerData();
    }
  }, [isOpen, customer]);

  const loadCustomerData = () => {
    // Get customer orders
    const customerOrders = mockOrders.filter(o => o.customer_id === customer.id);
    const customerSessions = mockSessions.filter(s => s.customer_id === customer.id);
    // ボトル管理は店舗在庫に変更されたため、顧客別ボトル数は0に設定
    const customerBottles: any[] = [];
    
    setOrders(customerOrders);
    setSessions(customerSessions);
    setBottles(customerBottles);

    // Calculate stats
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.total_yen, 0);
    const totalVisits = customerSessions.length;
    const averageSpent = totalVisits > 0 ? totalSpent / totalVisits : 0;
    
    // Get last visit
    const sortedSessions = customerSessions.sort((a, b) => 
      new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
    );
    const lastVisit = sortedSessions.length > 0 ? sortedSessions[0].opened_at : customer.created_at;

    // Calculate favorite items
    const itemCounts: Record<string, number> = {};
    customerOrders.forEach(order => {
      order.items.forEach(item => {
        const menuItem = mockMenuItems.find(m => m.id === item.menu_item.id);
        if (menuItem) {
          itemCounts[menuItem.name] = (itemCounts[menuItem.name] || 0) + item.qty;
        }
      });
    });
    
    const favoriteItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    setStats({
      totalVisits,
      totalSpent,
      averageSpent,
      lastVisit,
      favoriteItems,
      totalBottles: customerBottles.length,
      activeBottles: customerBottles.filter(b => b.status === 'active').length
    });
  };

  const getFilteredOrders = () => {
    if (dateFilter === 'all') return orders;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (dateFilter) {
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return orders;
    }
    
    return orders.filter(order => new Date(order.created_at) >= filterDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '下書き';
      case 'confirmed':
        return '確定';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      default:
        return '不明';
    }
  };

  if (!stats) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-purple-50 to-pink-50 -m-6 mb-6 p-6 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-purple-600" />
            {customer.display_name}様の詳細履歴
          </DialogTitle>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-1" />
              顧客ID: {customer.id.slice(-8)}
            </div>
            {customer.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-1" />
                {customer.email}
              </div>
            )}

          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="orders">注文履歴</TabsTrigger>
            <TabsTrigger value="sessions">来店履歴</TabsTrigger>
            <TabsTrigger value="bottles">ボトル</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">総来店回数</p>
                      <p className="text-xl font-bold text-blue-900">{stats.totalVisits}回</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <CreditCard className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700">累計支払額</p>
                      <p className="text-xl font-bold text-green-900">{formatCurrency(stats.totalSpent)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700">平均単価</p>
                      <p className="text-xl font-bold text-purple-900">{formatCurrency(stats.averageSpent)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                      <Wine className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700">保有ボトル</p>
                      <p className="text-xl font-bold text-yellow-900">{stats.activeBottles}本</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Favorite Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  よく注文される商品
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.favoriteItems.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium">{index + 1}</span>
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <Badge variant="secondary">{item.count}回</Badge>
                    </div>
                  ))}
                  {stats.favoriteItems.length === 0 && (
                    <p className="text-gray-500 text-center py-4">注文履歴がありません</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Last Visit Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  最終来店情報
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  最終来店日: {formatDateTime(stats.lastVisit)}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {/* Date Filter */}
            <div className="flex items-center space-x-4">
              <Label>期間フィルター:</Label>
              <div className="flex space-x-2">
                {[
                  { value: 'all', label: '全期間' },
                  { value: '7days', label: '7日間' },
                  { value: '30days', label: '30日間' },
                  { value: '90days', label: '90日間' }
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={dateFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {getFilteredOrders().map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">注文 #{order.id.slice(-6)}</CardTitle>
                        <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        <p className="text-lg font-bold text-purple-600 mt-1">
                          {formatCurrency(order.total_yen)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.menu_item.name} × {item.qty}</span>
                          <span>{formatCurrency(item.line_subtotal_yen)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getFilteredOrders().length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">該当する注文履歴がありません</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            {/* Sessions List */}
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">セッション #{session.id.slice(-6)}</span>
                          <Badge className={session.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {session.status === 'open' ? '進行中' : '終了'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          開始: {formatDateTime(session.opened_at)}
                        </p>
                        {session.closed_at && (
                          <p className="text-sm text-gray-600">
                            終了: {formatDateTime(session.closed_at)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">
                          {formatCurrency(orders.filter(o => o.session_id === session.id).reduce((sum, order) => sum + order.total_yen, 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">来店履歴がありません</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bottles" className="space-y-4">
            {/* Bottles List */}
            <div className="space-y-4">
              {bottles.map((bottle) => (
                <Card key={bottle.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Wine className="w-4 h-4 text-purple-500" />
                          <span className="font-medium">{bottle.name}</span>
                          <Badge className={bottle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {bottle.status === 'active' ? '使用中' : bottle.status === 'empty' ? '空' : '期限切れ'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          預かり開始: {formatDateTime(bottle.created_at)}
                        </p>
                        <p className="text-sm text-gray-600">
                          有効期限: {formatDateTime(bottle.expires_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${Math.max(0, bottle.remaining_ml / bottle.total_ml * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {bottle.remaining_ml}ml / {bottle.total_ml}ml
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {bottles.length === 0 && (
                <div className="text-center py-8">
                  <Wine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">ボトル保有履歴がありません</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>閉じる</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
