'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { 
  ArrowLeft, Wine, Search, Plus, Edit, AlertTriangle,
  Calendar, User, Droplets
} from 'lucide-react';
import { 
  mockBottles, mockCustomers, mockMenuItems, formatDate,
  getBottlePercentage, Bottle
} from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';
import { BottleModal } from '@/components/admin/BottleModal';

export default function BottleManagementPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState<Bottle | null>(null);
  const [modalMode, setModalMode] = useState<'register' | 'edit' | 'consume'>('register');
  
  const router = useRouter();
  const { info, success } = useNotificationContext();

  useEffect(() => {
    // モックデータの読み込み
    setBottles(mockBottles);
    setIsLoading(false);
  }, []);

  const filteredBottles = bottles.filter(bottle => {
    const matchesSearch = !searchQuery || 
      bottle.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bottle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 店舗単位のボトル残数サマリー
  const bottleSummary = bottles.reduce((acc, bottle) => {
    if (bottle.status === 'active') {
      const key = bottle.name;
      if (!acc[key]) {
        acc[key] = {
          name: bottle.name,
          totalBottles: 0,
          totalMl: 0,
          remainingMl: 0,
          percentage: 0
        };
      }
      acc[key].totalBottles += 1;
      acc[key].totalMl += bottle.total_ml;
      acc[key].remainingMl += bottle.remaining_ml;
    }
    return acc;
  }, {} as Record<string, { name: string; totalBottles: number; totalMl: number; remainingMl: number; percentage: number }>);

  // パーセンテージを計算
  Object.values(bottleSummary).forEach(summary => {
    summary.percentage = (summary.remainingMl / summary.totalMl) * 100;
  });

  const getMenuItemName = (menuItemId: string) => {
    const item = mockMenuItems.find(i => i.id === menuItemId);
    return item?.name || '不明';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'empty':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '使用中';
      case 'empty':
        return '空';
      case 'expired':
        return '期限切れ';
      default:
        return '不明';
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expireDate = new Date(expiresAt);
    const today = new Date();
    const diffDays = Math.ceil((expireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const addNewBottle = () => {
    setSelectedBottle(null);
    setModalMode('register');
    setShowBottleModal(true);
  };

  const editBottle = (bottle: Bottle) => {
    setSelectedBottle(bottle);
    setModalMode('edit');
    setShowBottleModal(true);
  };

  const recordConsumption = (bottle: Bottle) => {
    setSelectedBottle(bottle);
    setModalMode('consume');
    setShowBottleModal(true);
  };

  const handleBottleSave = (bottleData: Omit<Bottle, 'id' | 'stored_at' | 'updated_at'>) => {
    if (selectedBottle && modalMode === 'edit') {
      // Update existing bottle
      const updatedBottle = {
        ...selectedBottle,
        ...bottleData,
        updated_at: new Date().toISOString()
      };
      
      setBottles(bottles.map(b => 
        b.id === selectedBottle.id ? updatedBottle : b
      ));
      
      success('ボトル情報を更新しました', 'ボトル情報が正常に更新されました。');
    } else if (selectedBottle && modalMode === 'consume') {
      // Update consumption
      const updatedBottle = {
        ...selectedBottle,
        ...bottleData
      };
      
      setBottles(bottles.map(b => 
        b.id === selectedBottle.id ? updatedBottle : b
      ));
      
      success('消費記録を更新しました', 'ボトルの消費が記録されました。');
    } else {
      // Add new bottle
      const newBottle: Bottle = {
        ...bottleData,
        id: `bottle-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      
      setBottles([newBottle, ...bottles]);
      success('新規ボトルを登録しました', 'ボトルが正常に登録されました。');
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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">ボトル管理</h1>
                  <p className="text-xs sm:text-sm text-gray-500">店舗在庫・期限管理</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Button 
                  onClick={addNewBottle}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">新規登録</span>
                  <span className="sm:hidden">新規</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 店舗在庫サマリー */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">店舗在庫サマリー</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(bottleSummary).map((summary, index) => (
                <Card key={index} className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-blue-800">{summary.name}</span>
                      <Badge 
                        variant={summary.percentage > 20 ? "default" : "destructive"}
                        className={summary.percentage > 20 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {summary.percentage.toFixed(1)}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">残り本数:</span>
                        <span className="font-medium text-blue-900">{summary.totalBottles}本</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">残り容量:</span>
                        <span className="font-medium text-blue-900">{summary.remainingMl}ml</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">総容量:</span>
                        <span className="font-medium text-blue-900">{summary.totalMl}ml</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${
                            summary.percentage > 20 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(summary.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Wine className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">使用中</p>
                    <p className="text-xl font-bold text-green-900">
                      {bottles.filter(b => b.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-700">期限間近</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {bottles.filter(b => isExpiringSoon(b.expires_at)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Droplets className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">空ボトル</p>
                    <p className="text-xl font-bold text-gray-900">
                      {bottles.filter(b => b.status === 'empty').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-red-700">期限切れ</p>
                    <p className="text-xl font-bold text-red-900">
                      {bottles.filter(b => b.status === 'expired').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 検索・フィルター */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="ボトル名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">全ステータス</option>
                  <option value="active">使用中</option>
                  <option value="empty">空</option>
                  <option value="expired">期限切れ</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* ボトル一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBottles.map((bottle) => {
              const percentage = getBottlePercentage(bottle.remaining_ml, bottle.total_ml);
              const expiringSoon = isExpiringSoon(bottle.expires_at);
              
              return (
                <Card key={bottle.id} className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Wine className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{bottle.name}</h3>
                            <p className="text-sm text-gray-500">
                              {getMenuItemName(bottle.menu_item_id)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(bottle.status)}>
                          {getStatusText(bottle.status)}
                        </Badge>
                      </div>

                      {/* 残量 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>残量</span>
                          <span>{bottle.remaining_ml}ml / {bottle.total_ml}ml</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              percentage > 50 ? 'bg-green-600' :
                              percentage > 20 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {percentage}%
                        </div>
                      </div>

                      {/* 詳細情報 */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            期限
                          </span>
                          <span className={`font-medium ${
                            expiringSoon ? 'text-yellow-600' : 
                            bottle.status === 'expired' ? 'text-red-600' : ''
                          }`}>
                            {formatDate(bottle.expires_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center">
                            <Wine className="w-4 h-4 mr-1" />
                            在庫状況
                          </span>
                          <span className={`font-medium ${
                            bottle.status === 'active' ? 'text-green-600' : 
                            bottle.status === 'empty' ? 'text-gray-600' : 'text-red-600'
                          }`}>
                            {bottle.status === 'active' ? '在庫あり' : 
                             bottle.status === 'empty' ? '在庫なし' : '期限切れ'}
                          </span>
                        </div>
                      </div>

                      {/* 警告 */}
                      {expiringSoon && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center text-yellow-800">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">期限が近づいています</span>
                          </div>
                        </div>
                      )}

                      {bottle.status === 'expired' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center text-red-800">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">期限切れです</span>
                          </div>
                        </div>
                      )}

                      {/* アクションボタン */}
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => editBottle(bottle)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          編集
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => recordConsumption(bottle)}
                        >
                          <Droplets className="w-4 h-4 mr-1" />
                          消費記録
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredBottles.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wine className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">ボトルが見つかりません</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? '検索条件を変更してください' : 'ボトルを登録してください'}
              </p>
              <Button onClick={addNewBottle}>
                <Plus className="w-4 h-4 mr-2" />
                新規ボトル登録
              </Button>
            </div>
          )}
        </div>

        {/* Bottle Modal */}
        <BottleModal
          isOpen={showBottleModal}
          onClose={() => setShowBottleModal(false)}
          onSave={handleBottleSave}
          existingBottle={selectedBottle || undefined}
          mode={modalMode}
        />
      </div>
    </RoleGate>
  );
}