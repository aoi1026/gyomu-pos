'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Store, Users, BarChart3, Settings, 
  Plus, Edit, Eye, TrendingUp, AlertCircle
} from 'lucide-react';
import { 
  mockStores, mockStaff, formatCurrency, formatDateTime,
  Store as StoreModel
} from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';
import StoreRegistrationModal from '@/components/super/StoreRegistrationModal';
import StoreSettingsModal from '@/components/super/StoreSettingsModal';
import SettingsTemplateModal from '@/components/super/SettingsTemplateModal';
import StoreDetailsModal from '@/components/super/StoreDetailsModal';

export default function SuperStoresPage() {
  const [stores, setStores] = useState<StoreModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreModel | null>(null);
  
  const router = useRouter();
  const { info, success, error } = useNotificationContext();

  useEffect(() => {
    // 店舗データの読み込み
    setStores(mockStores);
    setIsLoading(false);
  }, []);

  const getStoreStats = (storeId: string) => {
    const storeStaff = mockStaff.filter(s => s.store_id === storeId);
    const activeStaff = storeStaff.filter(s => s.active);
    
    return {
      totalStaff: storeStaff.length,
      activeStaff: activeStaff.length,
      // モック売上データ
      monthlySales: Math.floor(Math.random() * 20000000) + 10000000,
      status: Math.random() > 0.1 ? 'active' : 'maintenance'
    };
  };

  const handleStoreRegistration = (storeData: Omit<StoreModel, 'id' | 'created_at' | 'updated_at'>) => {
    const newStore: StoreModel = {
      id: `store-${Date.now()}`,
      ...storeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setStores(prev => [...prev, newStore]);
    success('店舗が正常に登録されました', '新しい店舗がシステムに追加されました。');
  };

  const handleStoreSettingsUpdate = (storeId: string, settings: Partial<StoreModel>) => {
    setStores(prev => prev.map(store => 
      store.id === storeId 
        ? { ...store, ...settings, updated_at: new Date().toISOString() }
        : store
    ));
    success('設定が正常に更新されました', '店舗設定が変更されました。');
  };

  const handleSettingsDistribution = (storeIds: string[], settings: any) => {
    setStores(prev => prev.map(store => 
      storeIds.includes(store.id)
        ? { ...store, ...settings, updated_at: new Date().toISOString() }
        : store
    ));
    success(`${storeIds.length}店舗の設定が配布されました`, '設定テンプレートが正常に適用されました。');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['superadmin']}>
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
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">店舗管理</h1>
                  <p className="text-xs sm:text-sm text-gray-500">複数店舗の統括管理</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Button 
                  onClick={() => setShowRegistrationModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">新規店舗</span>
                  <span className="sm:hidden">新規</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 全体統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Store className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">総店舗数</p>
                    <p className="text-xl font-bold text-blue-900">{stores.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">総スタッフ数</p>
                    <p className="text-xl font-bold text-green-900">{mockStaff.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">月間総売上</p>
                    <p className="text-xl font-bold text-purple-900">
                      {formatCurrency(stores.reduce((sum, store) => sum + getStoreStats(store.id).monthlySales, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-700">稼働店舗</p>
                    <p className="text-xl font-bold text-orange-900">
                      {stores.filter(store => getStoreStats(store.id).status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 店舗一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => {
              const stats = getStoreStats(store.id);
              
              return (
                <Card key={store.id} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Store className="w-5 h-5 text-purple-600" />
                          <span>{store.name}</span>
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          営業終了: {store.closing_time}
                        </p>
                      </div>
                      <Badge className={
                        stats.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {stats.status === 'active' ? '稼働中' : 'メンテナンス'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* 基本情報 */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center mb-1">
                          <Users className="w-4 h-4 text-gray-500 mr-1" />
                          <span className="text-gray-600">スタッフ</span>
                        </div>
                        <div className="font-bold">{stats.activeStaff}/{stats.totalStaff}名</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center mb-1">
                          <BarChart3 className="w-4 h-4 text-gray-500 mr-1" />
                          <span className="text-gray-600">月間売上</span>
                        </div>
                        <div className="font-bold text-purple-600">
                          {formatCurrency(stats.monthlySales)}
                        </div>
                      </div>
                    </div>

                    {/* 設定情報 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">消費税率</span>
                        <span className="font-medium">{store.tax_bp / 100}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">サービス料率</span>
                        <span className="font-medium">{store.service_charge_bp / 100}%</span>
                      </div>
                    </div>

                    {/* 警告・通知 */}
                    {stats.status === 'maintenance' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center text-yellow-800">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">メンテナンス中</span>
                        </div>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedStore(store);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        詳細
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedStore(store);
                          setShowSettingsModal(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowTemplateModal(true)}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        設定配布
                      </Button>
                    </div>

                    {/* 最終更新 */}
                    <div className="text-xs text-gray-500 border-t pt-3">
                      最終更新: {formatDateTime(store.updated_at)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 設定テンプレート配布 */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>設定テンプレート配布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowTemplateModal(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  税率設定配布
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowTemplateModal(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  給与ルール配布
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowTemplateModal(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  権限テンプレート配布
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <StoreRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          onSave={handleStoreRegistration}
        />

        <StoreSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          store={selectedStore}
          onSave={handleStoreSettingsUpdate}
        />

        <SettingsTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onDistribute={handleSettingsDistribution}
        />

        <StoreDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          store={selectedStore}
        />
      </div>
    </RoleGate>
  );
}