'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Shield, Search, Filter, Download,
  AlertTriangle, Eye, Calendar, User
} from 'lucide-react';
import { 
  mockAuditLogs, mockStores, mockStaff, formatDateTime,
  AuditLog
} from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';

export default function SuperAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const { info } = useNotificationContext();

  useEffect(() => {
    // 監査ログの読み込み
    setAuditLogs(mockAuditLogs);
    setFilteredLogs(mockAuditLogs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // フィルタリング処理
    let filtered = auditLogs;

    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStore !== 'all') {
      filtered = filtered.filter(log => log.store_id === selectedStore);
    }

    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    if (dateFrom) {
      filtered = filtered.filter(log => log.created_at >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(log => log.created_at <= dateTo + 'T23:59:59Z');
    }

    setFilteredLogs(filtered);
  }, [auditLogs, searchQuery, selectedStore, selectedAction, dateFrom, dateTo]);

  const getStoreName = (storeId: string) => {
    const store = mockStores.find(s => s.id === storeId);
    return store?.name || '不明';
  };

  const getStaffName = (staffId?: string) => {
    if (!staffId) return 'システム';
    const staff = mockStaff.find(s => s.id === staffId);
    return staff?.name || '不明';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'confirm':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'create':
        return '作成';
      case 'update':
        return '更新';
      case 'delete':
        return '削除';
      case 'confirm':
        return '確定';
      default:
        return action;
    }
  };

  const getEntityText = (entity: string) => {
    switch (entity) {
      case 'order':
        return '注文';
      case 'menu_item':
        return 'メニュー';
      case 'payment':
        return '決済';
      case 'staff':
        return 'スタッフ';
      case 'customer':
        return '顧客';
      default:
        return entity;
    }
  };

  const exportLogs = () => {
    // CSV出力の処理（モック）
    info('監査ログをCSVで出力します', 'データをダウンロードしています。', 3000);
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
                  <h1 className="text-xl font-bold text-gray-900">監査ログ</h1>
                  <p className="text-sm text-gray-500">全店舗の操作履歴・セキュリティログ</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  <Shield className="w-3 h-3 mr-1" />
                  機密情報
                </Badge>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={exportLogs}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV出力
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* フィルター */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                フィルター
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">検索</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="エンティティ・アクション・IDで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="store">店舗</Label>
                  <select
                    id="store"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">全店舗</option>
                    {mockStores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="action">アクション</Label>
                  <select
                    id="action"
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">全アクション</option>
                    <option value="create">作成</option>
                    <option value="update">更新</option>
                    <option value="delete">削除</option>
                    <option value="confirm">確定</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="date-from">期間</Label>
                  <div className="space-y-2">
                    <Input
                      id="date-from"
                      type="date"
                      placeholder="開始日"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full"
                    />
                    <Input
                      type="date"
                      placeholder="終了日"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">総ログ数</p>
                    <p className="text-xl font-bold text-blue-900">{filteredLogs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">操作ユーザー数</p>
                    <p className="text-xl font-bold text-green-900">
                      {new Set(filteredLogs.map(log => log.actor_staff_id).filter(Boolean)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">今日のログ</p>
                    <p className="text-xl font-bold text-purple-900">
                      {filteredLogs.filter(log => 
                        log.created_at.startsWith(new Date().toISOString().split('T')[0])
                      ).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-red-700">削除操作</p>
                    <p className="text-xl font-bold text-red-900">
                      {filteredLogs.filter(log => log.action === 'delete').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ログ一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>監査ログ一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge className={getActionColor(log.action)}>
                            {getActionText(log.action)}
                          </Badge>
                          <span className="font-medium">{getEntityText(log.entity)}</span>
                          <span className="text-sm text-gray-500">ID: {log.entity_id.slice(-8)}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">店舗:</span>
                            <span className="ml-2 font-medium">{getStoreName(log.store_id)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">操作者:</span>
                            <span className="ml-2 font-medium">{getStaffName(log.actor_staff_id)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">日時:</span>
                            <span className="ml-2 font-medium">{formatDateTime(log.created_at)}</span>
                          </div>
                        </div>

                        {log.diff && Object.keys(log.diff).length > 0 && (
                          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                            <div className="text-sm font-medium text-gray-700 mb-2">変更内容:</div>
                            <pre className="text-xs text-gray-600 overflow-x-auto">
                              {JSON.stringify(log.diff, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => info('ログ詳細表示機能は今後実装予定です', 'この機能は開発中です。', 3000)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        詳細
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredLogs.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">ログが見つかりません</h3>
                  <p className="text-gray-500">
                    {searchQuery || selectedStore !== 'all' || selectedAction !== 'all' || dateFrom || dateTo
                      ? 'フィルター条件を変更してください'
                      : '監査ログがありません'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}