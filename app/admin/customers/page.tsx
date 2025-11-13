'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, Users, Search, Plus, Edit, Eye, Star,
  Calendar, CreditCard, Wine, AlertTriangle, Crown, User
} from 'lucide-react';
import { 
  mockCustomers, mockOrders, mockBottles, formatCurrency, formatDateTime,
  Customer
} from '@/lib/mock-data';
import { getNominationStats, formatNominationHistory } from '@/lib/customer-nomination-system';
import { useNotificationContext } from '@/lib/notification-context';
import { CustomerRegistrationModal } from '@/components/admin/CustomerRegistrationModal';
import { CustomerHistoryModal } from '@/components/admin/CustomerHistoryModal';

interface CustomerWithStats extends Customer {
  total_visits: number;
  total_spent: number;
  last_visit: string;
  bottle_count: number;
  vip_status: boolean;
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  
  const router = useRouter();
  const { info, success } = useNotificationContext();

  useEffect(() => {
    // 顧客データの読み込みと統計計算
    const customersWithStats: CustomerWithStats[] = mockCustomers.map(customer => {
      const customerOrders = mockOrders.filter(o => o.customer_id === customer.id);
      // ボトル管理は店舗在庫に変更されたため、顧客別ボトル数は0に設定
      const customerBottles: any[] = [];
      
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.total_yen, 0);
      const totalVisits = customerOrders.length;
      const lastVisit = customerOrders.length > 0 
        ? customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : customer.created_at;
      
      return {
        ...customer,
        total_visits: totalVisits,
        total_spent: totalSpent,
        last_visit: lastVisit,
        bottle_count: customerBottles.length,
        vip_status: totalSpent > 500000 || customerBottles.length > 2
      };
    });
    
    setCustomers(customersWithStats);
    setIsLoading(false);
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchQuery || 
      customer.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVip = !showVipOnly || customer.vip_status;
    return matchesSearch && matchesVip && !customer.blacklist;
  });

  const startEdit = (customer: CustomerWithStats) => {
    setEditingCustomer({ ...customer });
  };

  const saveEdit = () => {
    if (!editingCustomer) return;
    
    setCustomers(customers.map(c => 
      c.id === editingCustomer.id ? editingCustomer : c
    ));
    setEditingCustomer(null);
    
    console.log('顧客情報更新:', editingCustomer);
  };

  const toggleVipStatus = (customerId: string) => {
    setCustomers(customers.map(c => 
      c.id === customerId 
        ? { ...c, vip_status: !c.vip_status }
        : c
    ));
  };

  const addNewCustomer = () => {
    setSelectedCustomer(null);
    setShowRegistrationModal(true);
  };

  const editCustomer = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setShowRegistrationModal(true);
  };

  const viewCustomerHistory = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
  };

  const handleCustomerSave = (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedCustomer) {
      // Update existing customer
      const updatedCustomer = {
        ...selectedCustomer,
        ...customerData,
        updated_at: new Date().toISOString()
      };
      
      setCustomers(customers.map(c => 
        c.id === selectedCustomer.id ? updatedCustomer : c
      ));
      
      success('顧客情報を更新しました', '顧客情報が正常に更新されました。');
    } else {
      // Add new customer
      const newCustomer: CustomerWithStats = {
        ...customerData,
        id: `customer-${Date.now()}`,
        created_at: new Date().toISOString(),
        total_visits: 0,
        total_spent: 0,
        last_visit: new Date().toISOString(),
        bottle_count: 0,
        vip_status: false
      };
      
      setCustomers([newCustomer, ...customers]);
      success('新規顧客を登録しました', '顧客情報が正常に登録されました。');
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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">顧客管理</h1>
                  <p className="text-xs sm:text-sm text-gray-500">顧客情報・来店履歴・VIP管理</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Button 
                  onClick={addNewCustomer}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">新規顧客</span>
                  <span className="sm:hidden">新規</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">総顧客数</p>
                    <p className="text-xl font-bold text-blue-900">{customers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <Crown className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-700">VIP顧客</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {customers.filter(c => c.vip_status).length}
                    </p>
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
                    <p className="text-sm text-green-700">平均客単価</p>
                    <p className="text-xl font-bold text-green-900">
                      {(() => {
                        const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);
                        const totalVisits = customers.reduce((sum, c) => sum + c.total_visits, 0);
                        const avgValue = totalVisits > 0 ? totalSpent / totalVisits : 0;
                        return `¥${new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avgValue)}`;
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Wine className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">ボトル保有</p>
                    <p className="text-xl font-bold text-purple-900">
                      {customers.filter(c => c.bottle_count > 0).length}名
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 検索・フィルター */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex space-x-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="search">顧客検索</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="顧客名・メールアドレスで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vip-filter"
                    checked={showVipOnly}
                    onCheckedChange={setShowVipOnly}
                  />
                  <Label htmlFor="vip-filter">VIPのみ表示</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 顧客一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  {editingCustomer?.id === customer.id ? (
                    // 編集モード
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="display-name">表示名</Label>
                        <Input
                          id="display-name"
                          value={editingCustomer.display_name}
                          onChange={(e) => setEditingCustomer({...editingCustomer, display_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">メールアドレス</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editingCustomer.email || ''}
                          onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="note">メモ</Label>
                        <Textarea
                          id="note"
                          value={editingCustomer.note || ''}
                          onChange={(e) => setEditingCustomer({...editingCustomer, note: e.target.value})}
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="vip-status"
                          checked={editingCustomer.vip_status}
                          onCheckedChange={(checked) => setEditingCustomer({...editingCustomer, vip_status: checked})}
                        />
                        <Label htmlFor="vip-status">VIPステータス</Label>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={saveEdit}>
                          保存
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingCustomer(null)}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 表示モード
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg flex items-center">
                              {customer.display_name}
                              {customer.vip_status && (
                                <Crown className="w-4 h-4 text-yellow-500 ml-2" />
                              )}
                            </h3>
                            {customer.email && (
                              <p className="text-sm text-gray-500">{customer.email}</p>
                            )}
                          </div>
                        </div>
                        {customer.vip_status && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                      </div>

                      {/* 統計情報 */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center mb-1">
                            <Calendar className="w-4 h-4 text-gray-500 mr-1" />
                            <span className="text-gray-600">来店回数</span>
                          </div>
                          <div className="font-bold text-lg">{customer.total_visits}回</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center mb-1">
                            <CreditCard className="w-4 h-4 text-gray-500 mr-1" />
                            <span className="text-gray-600">累計支払</span>
                          </div>
                          <div className="font-bold text-lg text-purple-600">
                            {formatCurrency(customer.total_spent)}
                          </div>
                        </div>
                      </div>

                      {/* 指名情報 */}
                      {customer.main_nomination_cast_name && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center mb-2">
                            <User className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-purple-800">本指名キャスト</span>
                          </div>
                          <div className="text-lg font-bold text-purple-900">
                            {customer.main_nomination_cast_name}
                          </div>
                          <div className="text-xs text-purple-600 mt-1">
                            指名回数: {getNominationStats(customer).main_nominations}回
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">最終来店</span>
                          <span className="font-medium">
                            {formatDateTime(customer.last_visit).split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ボトル保有</span>
                          <span className="font-medium flex items-center">
                            <Wine className="w-4 h-4 mr-1 text-purple-500" />
                            {customer.bottle_count}本
                          </span>
                        </div>
                        {customer.note && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-3">
                            <p className="text-blue-800 text-sm">{customer.note}</p>
                          </div>
                        )}
                      </div>

                      {/* アクションボタン */}
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => editCustomer(customer)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          編集
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => viewCustomerHistory(customer)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          履歴
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => toggleVipStatus(customer.id)}
                          className={customer.vip_status ? 'bg-yellow-50 border-yellow-300' : ''}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          VIP
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">顧客が見つかりません</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? '検索条件を変更してください' : '顧客を登録してください'}
              </p>
              <Button onClick={addNewCustomer}>
                <Plus className="w-4 h-4 mr-2" />
                新規顧客登録
              </Button>
            </div>
          )}
        </div>

        {/* Customer Registration Modal */}
        <CustomerRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          onSave={handleCustomerSave}
          existingCustomer={selectedCustomer || undefined}
        />

        {/* Customer History Modal */}
        {selectedCustomer && (
          <CustomerHistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            customer={selectedCustomer}
          />
        )}
      </div>
    </RoleGate>
  );
}