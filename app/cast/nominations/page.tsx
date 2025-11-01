'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Users, Star, Crown, Calendar, DollarSign, 
  Plus, Edit, Eye, TrendingUp, Award, User
} from 'lucide-react';
import { 
  mockCustomers, mockStaff, formatCurrency, formatDateTime,
  Customer, Staff
} from '@/lib/mock-data';
import { 
  getNominationStats, formatNominationHistory, 
  promoteFieldToMain, changeMainNomination 
} from '@/lib/customer-nomination-system';
import { useNotificationContext } from '@/lib/notification-context';

interface CastNominationStats {
  total_nominations: number;
  main_nominations: number;
  field_nominations: number;
  total_amount: number;
  this_month_nominations: number;
  this_month_amount: number;
  top_customers: Array<{
    customer: Customer;
    nomination_count: number;
    total_amount: number;
  }>;
}

export default function CastNominationsPage() {
  const [cast, setCast] = useState<Staff | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CastNominationStats | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [promotionNotes, setPromotionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    // 現在のキャスト情報を取得（実際のAPIでは認証から取得）
    const currentCast = mockStaff.find(s => s.roles.includes('cast'));
    if (!currentCast) {
      router.push('/login');
      return;
    }
    
    setCast(currentCast);
    
    // 本指名顧客を取得
    const mainNominationCustomers = mockCustomers.filter(customer => 
      customer.main_nomination_cast_id === currentCast.id
    );
    setCustomers(mainNominationCustomers);
    
    // 統計情報を計算
    calculateStats(currentCast, mainNominationCustomers);
    
    setIsLoading(false);
  }, [router]);

  const calculateStats = (cast: Staff, customers: Customer[]) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let totalNominations = 0;
    let mainNominations = 0;
    let fieldNominations = 0;
    let totalAmount = 0;
    let thisMonthNominations = 0;
    let thisMonthAmount = 0;
    
    const topCustomers: Array<{
      customer: Customer;
      nomination_count: number;
      total_amount: number;
    }> = [];
    
    customers.forEach(customer => {
      const customerStats = getNominationStats(customer);
      const nominationHistory = formatNominationHistory(customer);
      
      totalNominations += customerStats.total_nominations;
      mainNominations += customerStats.main_nominations;
      fieldNominations += customerStats.field_nominations;
      
      // 今月の指名を計算
      const thisMonthHistory = nominationHistory.filter(h => {
        const historyDate = new Date(h.started_at);
        return historyDate.getMonth() === thisMonth && historyDate.getFullYear() === thisYear;
      });
      
      thisMonthNominations += thisMonthHistory.length;
      
      // トップ顧客の計算
      if (customerStats.total_nominations > 0) {
        topCustomers.push({
          customer,
          nomination_count: customerStats.total_nominations,
          total_amount: 0 // 実際の金額計算は複雑なので簡略化
        });
      }
    });
    
    // トップ顧客をソート
    topCustomers.sort((a, b) => b.nomination_count - a.nomination_count);
    
    setStats({
      total_nominations: totalNominations,
      main_nominations: mainNominations,
      field_nominations: fieldNominations,
      total_amount: totalAmount,
      this_month_nominations: thisMonthNominations,
      this_month_amount: thisMonthAmount,
      top_customers: topCustomers.slice(0, 5)
    });
  };

  const handlePromotion = async () => {
    if (!selectedCustomer || !cast) return;
    
    try {
      // 場内指名から本指名への昇格
      const updatedCustomer = promoteFieldToMain(
        selectedCustomer,
        cast.id,
        cast.name,
        promotionNotes
      );
      
      // 顧客リストを更新
      setCustomers(customers.map(c => 
        c.id === updatedCustomer.id ? updatedCustomer : c
      ));
      
      success('昇格完了', `${selectedCustomer.display_name}を本指名に昇格しました`);
      setShowPromotionDialog(false);
      setSelectedCustomer(null);
      setPromotionNotes('');
    } catch (err) {
      error('エラー', '昇格処理に失敗しました');
    }
  };

  const handleChangeMainNomination = async () => {
    if (!selectedCustomer || !cast) return;
    
    try {
      // 本指名キャストの変更
      const updatedCustomer = changeMainNomination(
        selectedCustomer,
        cast.id,
        cast.name,
        promotionNotes
      );
      
      // 顧客リストを更新
      setCustomers(customers.map(c => 
        c.id === updatedCustomer.id ? updatedCustomer : c
      ));
      
      success('変更完了', `${selectedCustomer.display_name}の本指名を変更しました`);
      setShowChangeDialog(false);
      setSelectedCustomer(null);
      setPromotionNotes('');
    } catch (err) {
      error('エラー', '変更処理に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cast) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセスエラー</h1>
          <p className="text-gray-600">キャスト情報を取得できませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['cast']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ダッシュボード
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">指名管理</h1>
                  <p className="text-sm text-gray-500">{cast.name}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 統計カード */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <Crown className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700">本指名数</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.main_nominations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <Star className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">場内指名数</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.field_nominations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700">今月の指名</p>
                      <p className="text-2xl font-bold text-green-900">{stats.this_month_nominations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                      <Award className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700">総指名数</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.total_nominations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 本指名顧客一覧 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="w-5 h-5 mr-2" />
                  本指名顧客
                </CardTitle>
                <CardDescription>
                  現在本指名されている顧客一覧
                </CardDescription>
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Crown className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>本指名顧客がいません</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customers.map((customer) => {
                      const customerStats = getNominationStats(customer);
                      return (
                        <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{customer.display_name}</h4>
                              <p className="text-sm text-gray-500">
                                指名回数: {customerStats.main_nominations}回
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowChangeDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              変更
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                // 履歴表示の実装
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              履歴
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* トップ顧客 */}
            {stats && stats.top_customers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    トップ顧客
                  </CardTitle>
                  <CardDescription>
                    指名回数の多い顧客
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.top_customers.map((item, index) => (
                      <div key={item.customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-yellow-700">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{item.customer.display_name}</h4>
                            <p className="text-sm text-gray-500">
                              指名回数: {item.nomination_count}回
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          {item.nomination_count}回
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 昇格ダイアログ */}
        <Dialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Crown className="w-5 h-5 mr-2" />
                場内指名から本指名へ昇格
              </DialogTitle>
              <DialogDescription>
                {selectedCustomer?.display_name}を本指名に昇格します
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">昇格情報</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>顧客:</span>
                    <span>{selectedCustomer?.display_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>キャスト:</span>
                    <span>{cast?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>昇格タイプ:</span>
                    <span>場内指名 → 本指名</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="promotion-notes">メモ（任意）</Label>
                <Textarea
                  id="promotion-notes"
                  placeholder="昇格の理由や特記事項を入力してください"
                  value={promotionNotes}
                  onChange={(e) => setPromotionNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowPromotionDialog(false);
                setSelectedCustomer(null);
                setPromotionNotes('');
              }}>
                キャンセル
              </Button>
              <Button onClick={handlePromotion}>
                昇格実行
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 本指名変更ダイアログ */}
        <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                本指名変更
              </DialogTitle>
              <DialogDescription>
                {selectedCustomer?.display_name}の本指名を変更します
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">変更情報</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>顧客:</span>
                    <span>{selectedCustomer?.display_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>新しいキャスト:</span>
                    <span>{cast?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>変更タイプ:</span>
                    <span>本指名変更</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="change-notes">メモ（任意）</Label>
                <Textarea
                  id="change-notes"
                  placeholder="変更の理由や特記事項を入力してください"
                  value={promotionNotes}
                  onChange={(e) => setPromotionNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowChangeDialog(false);
                setSelectedCustomer(null);
                setPromotionNotes('');
              }}>
                キャンセル
              </Button>
              <Button onClick={handleChangeMainNomination}>
                変更実行
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  );
}
