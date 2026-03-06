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
  Plus, Edit, Eye, TrendingUp, Award, User, Search
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

interface NominationSummary {
  total_customers: number;
  main_nomination_customers: number;
  field_nomination_customers: number;
  total_nominations: number;
  this_month_nominations: number;
  top_casts: Array<{
    cast: Staff;
    nomination_count: number;
    customer_count: number;
  }>;
}

export default function AdminNominationsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [casts, setCasts] = useState<Staff[]>([]);
  const [summary, setSummary] = useState<NominationSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCast, setSelectedCast] = useState<string>('');
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [promotionNotes, setPromotionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    // データの読み込み
    setCustomers(mockCustomers);
    setCasts(mockStaff.filter(s => s.roles.includes('cast')));
    calculateSummary();
    setIsLoading(false);
  }, []);

  const calculateSummary = () => {
    const castList = mockStaff.filter(s => s.roles.includes('cast'));
    
    let totalCustomers = mockCustomers.length;
    let mainNominationCustomers = mockCustomers.filter(c => c.main_nomination_cast_id).length;
    let fieldNominationCustomers = 0; // 場内指名のみの顧客数
    let totalNominations = 0;
    let thisMonthNominations = 0;
    
    const topCasts: Array<{
      cast: Staff;
      nomination_count: number;
      customer_count: number;
    }> = [];
    
    castList.forEach(cast => {
      const castCustomers = mockCustomers.filter(c => c.main_nomination_cast_id === cast.id);
      const castNominationCount = castCustomers.reduce((sum, customer) => {
        const stats = getNominationStats(customer);
        return sum + stats.total_nominations;
      }, 0);
      
      totalNominations += castNominationCount;
      
      if (castCustomers.length > 0) {
        topCasts.push({
          cast,
          nomination_count: castNominationCount,
          customer_count: castCustomers.length
        });
      }
    });
    
    // トップキャストをソート
    topCasts.sort((a, b) => b.nomination_count - a.nomination_count);
    
    setSummary({
      total_customers: totalCustomers,
      main_nomination_customers: mainNominationCustomers,
      field_nomination_customers: fieldNominationCustomers,
      total_nominations: totalNominations,
      this_month_nominations: thisMonthNominations,
      top_casts: topCasts.slice(0, 5)
    });
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCast = !selectedCast || selectedCast === 'all' || customer.main_nomination_cast_id === selectedCast;
    return matchesSearch && matchesCast;
  });

  const handlePromotion = async () => {
    if (!selectedCustomer || !selectedCast) return;
    
    const cast = casts.find(c => c.id === selectedCast);
    if (!cast) return;
    
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
      
      success('昇格完了', `${selectedCustomer.display_name}を本指名に昇格しました（担当: ${cast.name}）`);
      setShowPromotionDialog(false);
      setSelectedCustomer(null);
      setPromotionNotes('');
      calculateSummary();
    } catch (err) {
      error('エラー', '昇格処理に失敗しました');
    }
  };

  const handleChangeMainNomination = async () => {
    if (!selectedCustomer || !selectedCast) return;
    
    const cast = casts.find(c => c.id === selectedCast);
    if (!cast) return;
    
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
      
      success('変更完了', `${selectedCustomer.display_name}の本指名を変更しました（担当: ${cast.name}）`);
      setShowChangeDialog(false);
      setSelectedCustomer(null);
      setPromotionNotes('');
      calculateSummary();
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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">指名管理</h1>
                  <p className="text-xs sm:text-sm text-gray-500">顧客の指名状況と管理</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 統計カード */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700">総顧客数</p>
                      <p className="text-2xl font-bold text-purple-900">{summary.total_customers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <Crown className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">本指名顧客</p>
                      <p className="text-2xl font-bold text-blue-900">{summary.main_nomination_customers}</p>
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
                      <p className="text-sm text-green-700">総指名数</p>
                      <p className="text-2xl font-bold text-green-900">{summary.total_nominations}</p>
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
                      <p className="text-sm text-yellow-700">今月の指名</p>
                      <p className="text-2xl font-bold text-yellow-900">{summary.this_month_nominations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                <div className="w-64">
                  <Label htmlFor="cast-filter">担当キャスト</Label>
                  <Select value={selectedCast} onValueChange={setSelectedCast}>
                    <SelectTrigger>
                      <SelectValue placeholder="すべてのキャスト" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべてのキャスト</SelectItem>
                      {casts.map((cast) => (
                        <SelectItem key={cast.id} value={cast.id}>
                          {cast.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 顧客一覧 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  顧客一覧
                </CardTitle>
                <CardDescription>
                  {filteredCustomers.length}件の顧客
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredCustomers.map((customer) => {
                    const customerStats = getNominationStats(customer);
                    const assignedCast = casts.find(c => c.id === customer.main_nomination_cast_id);
                    
                    return (
                      <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{customer.display_name}</h4>
                            <p className="text-sm text-gray-500">
                              {assignedCast ? `担当: ${assignedCast.name}` : 'フリー顧客'}
                            </p>
                            <p className="text-xs text-gray-400">
                              指名回数: {customerStats.total_nominations}回
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {customer.main_nomination_cast_id ? (
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
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowPromotionDialog(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              本指名
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
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
              </CardContent>
            </Card>

            {/* トップキャスト */}
            {summary && summary.top_casts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    トップキャスト
                  </CardTitle>
                  <CardDescription>
                    指名数の多いキャスト
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summary.top_casts.map((item, index) => (
                      <div key={item.cast.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-yellow-700">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{item.cast.name}</h4>
                            <p className="text-sm text-gray-500">
                              顧客数: {item.customer_count}名
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
                本指名設定
              </DialogTitle>
              <DialogDescription>
                {selectedCustomer?.display_name}を本指名に設定します
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>担当キャスト</Label>
                <Select value={selectedCast} onValueChange={setSelectedCast}>
                  <SelectTrigger>
                    <SelectValue placeholder="キャストを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {casts.map((cast) => (
                      <SelectItem key={cast.id} value={cast.id}>
                        {cast.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="promotion-notes">メモ（任意）</Label>
                <Textarea
                  id="promotion-notes"
                  placeholder="本指名設定の理由や特記事項を入力してください"
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
                setSelectedCast('');
              }}>
                キャンセル
              </Button>
              <Button 
                onClick={handlePromotion}
                disabled={!selectedCast}
              >
                本指名設定
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
              <div className="space-y-2">
                <Label>新しい担当キャスト</Label>
                <Select value={selectedCast} onValueChange={setSelectedCast}>
                  <SelectTrigger>
                    <SelectValue placeholder="キャストを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {casts.map((cast) => (
                      <SelectItem key={cast.id} value={cast.id}>
                        {cast.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                setSelectedCast('');
              }}>
                キャンセル
              </Button>
              <Button 
                onClick={handleChangeMainNomination}
                disabled={!selectedCast}
              >
                変更実行
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  );
}
