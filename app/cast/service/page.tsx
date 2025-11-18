'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Bell, Users, Utensils, Wine, 
  Coffee, Phone, MessageCircle, Clock, CheckCircle
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface Table {
  id: number;
  name: string;
  status: string;
}

interface Session {
  id: number;
  table_id: number;
  status: number;
}

export default function ServicePage() {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  
  const router = useRouter();
  const { success, info, error } = useNotificationContext();

  const serviceTypes = [
    { id: 'staff_call', name: 'スタッフ呼び出し', icon: Bell, color: 'blue' },
    { id: 'towel', name: 'おしぼり交換', icon: Utensils, color: 'green' },
    { id: 'ashtray', name: '灰皿交換', icon: Coffee, color: 'purple' },
    { id: 'glass', name: 'グラス交換', icon: Wine, color: 'orange' },
    { id: 'chopsticks', name: 'お箸交換', icon: Utensils, color: 'red' },
    { id: 'other', name: 'その他', icon: MessageCircle, color: 'gray' }
  ];

  // テーブル一覧を取得
  useEffect(() => {
    const loadTables = async () => {
      try {
        const response = await fetch('/api/tables');
        const result = await response.json();
        
        if (result.success && result.tables) {
          setTables(result.tables);
        }
      } catch (err) {
        console.error('テーブル一覧取得エラー:', err);
      } finally {
        setIsLoadingTables(false);
      }
    };

    const loadSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        const result = await response.json();
        
        if (result.success && result.data) {
          // アクティブなセッション（status=1）のみを取得
          const activeSessions = result.data.filter((s: Session) => s.status === 1);
          setSessions(activeSessions);
        }
      } catch (err) {
        console.error('セッション一覧取得エラー:', err);
      }
    };

    loadTables();
    loadSessions();
  }, []);

  const getServiceIcon = (type: string) => {
    const service = serviceTypes.find(s => s.id === type);
    return service?.icon || MessageCircle;
  };

  const getServiceColor = (type: string) => {
    const service = serviceTypes.find(s => s.id === type);
    return service?.color || 'gray';
  };

  const handleServiceRequest = async () => {
    if (!selectedTable || !serviceType) {
      info('入力してください', 'テーブルとサービス種別を選択してください。');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const service = serviceTypes.find(s => s.id === serviceType);
      const tableId = parseInt(selectedTable);
      const table = tables.find(t => t.id === tableId);
      
      // 選択されたテーブルのアクティブなセッションを取得
      const activeSession = sessions.find(s => s.table_id === tableId);
      
      if (!activeSession) {
        error('エラー', '選択されたテーブルにアクティブなセッションがありません。');
        setIsSubmitting(false);
        return;
      }

      // スタッフ呼び出しの場合
      if (serviceType === 'staff_call') {
        // callmanagerテーブルにスタッフ呼び出しを保存
        const response = await fetch('/api/callmanager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cast_id: null, // キャスト選択なし
            table_id: tableId,
            session_id: activeSession.id,
            calltype: 'service'
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          // 通知を作成
          try {
            await fetch('/api/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'staff_call',
                table_id: tableId,
                table_label: table?.name || `テーブル${tableId}`,
                cast_name: null,
                message: `スタッフ呼び出し${note ? `: ${note}` : ''}`,
                priority: 'high'
              }),
            });
          } catch (notificationError) {
            console.error('通知送信エラー:', notificationError);
          }

          success(
            'スタッフ呼び出しを送信しました',
            `${table?.name}でスタッフ呼び出しのリクエストを受け付けました。管理者に通知されました。`
          );
        } else {
          error('エラー', result.error || 'スタッフ呼び出しの送信に失敗しました。');
          setIsSubmitting(false);
          return;
        }
      } else {
        // その他のサービス注文の場合（将来の実装用）
        // 現在はモック処理
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        success(
          'サービスリクエストを送信しました',
          `${table?.name}で${service?.name}のリクエストを受け付けました。スタッフが対応いたします。`
        );
      }
      
      // フォームリセット
      setSelectedTable('');
      setServiceType('');
      setNote('');
      
    } catch (err) {
      console.error('サービスリクエストエラー:', err);
      error('エラー', 'サービスリクエストの送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGate allowedRoles={['cast', 'admin', 'superadmin']}>
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
                  <h1 className="text-xl font-bold text-gray-900">サービス注文</h1>
                  <p className="text-sm text-gray-500">スタッフ呼び出し・サービスリクエスト</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* サービスリクエストフォーム */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                サービスリクエスト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* テーブル選択 */}
              <div>
                <Label htmlFor="table">テーブル選択</Label>
                <select
                  id="table"
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoadingTables}
                >
                  <option value="">テーブルを選択してください</option>
                  {tables
                    .filter(table => {
                      // アクティブなセッションがあるテーブルのみ表示
                      return sessions.some(s => s.table_id === table.id);
                    })
                    .map(table => (
                      <option key={table.id} value={table.id.toString()}>
                        {table.name}
                      </option>
                    ))}
                </select>
                {isLoadingTables && (
                  <p className="text-sm text-gray-500 mt-1">テーブル一覧を読み込み中...</p>
                )}
              </div>

              {/* サービス種別選択 */}
              <div>
                <Label>サービス種別</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {serviceTypes.map((service) => {
                    const IconComponent = service.icon;
                    return (
                      <Button
                        key={service.id}
                        variant={serviceType === service.id ? "default" : "outline"}
                        className={`h-20 flex-col space-y-2 ${
                          serviceType === service.id 
                            ? service.id === 'other' 
                              ? 'bg-gray-600 hover:bg-gray-700' 
                              : `bg-${service.color}-600 hover:bg-${service.color}-700`
                            : `hover:bg-${service.color}-50 hover:border-${service.color}-300`
                        }`}
                        onClick={() => setServiceType(service.id)}
                      >
                        <IconComponent className="w-6 h-6" />
                        <span className="text-sm font-medium">{service.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 備考 */}
              <div>
                <Label htmlFor="note">備考・詳細</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="サービス内容の詳細や特別な要望があれば記入してください..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* 送信ボタン */}
              <Button
                onClick={handleServiceRequest}
                disabled={isSubmitting || !selectedTable || !serviceType}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    送信中...
                  </div>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    サービスリクエストを送信
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 最近のリクエスト履歴（モック） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                最近のリクエスト履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { table: 'テーブル1', service: 'スタッフ呼び出し', time: '19:45', status: 'completed' },
                  { table: 'VIPルーム1', service: 'おしぼり交換', time: '19:30', status: 'processing' },
                  { table: 'テーブル2', service: 'グラス交換', time: '19:15', status: 'completed' },
                  { table: 'カウンター席', service: '灰皿交換', time: '19:00', status: 'completed' }
                ].map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        request.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="font-medium">{request.table}</span>
                      <span className="text-gray-600">{request.service}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{request.time}</span>
                      <Badge variant="secondary" className={
                        request.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }>
                        {request.status === 'completed' ? '完了' : '対応中'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}
