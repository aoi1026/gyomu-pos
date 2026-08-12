'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wine, Users, Settings, Shield, UserCheck, Eye, EyeOff, Lock, Mail, Tablet, Monitor, ArrowRight, AlertCircle } from 'lucide-react';
import { testAccounts } from '@/lib/auth';
import { loginAsTable, TableAuth } from '@/lib/table-auth';
import { mockTables, mockCustomers } from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Table {
  id: number;
  name: string;
  capacity: number | null;
  other: string;
  created_at: string;
  updated_at: string;
}

type UserRole = 'table' | 'cast' | 'admin' | 'superadmin';

interface RoleConfig {
  id: UserRole;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  features: string[];
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [step, setStep] = useState<'role' | 'login' | 'table'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [tableCredentials, setTableCredentials] = useState({
    table_id: ''
  });
  const [adminCredentials, setAdminCredentials] = useState({
    email: '',
    password: ''
  });
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const { success, error } = useNotificationContext();

  // テーブルデータを取得
  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/tables');
      const result = await response.json();
      
      if (result.success) {
        setTables(result.tables);
      } else {
        error('エラー', 'テーブルデータの取得に失敗しました');
      }
    } catch (err) {
      error('エラー', 'テーブルデータの取得に失敗しました');
    } finally {
      setIsLoadingTables(false);
    }
  };

  useEffect(() => {
    if (isOpen && step === 'table') {
      loadTables();
    }
  }, [isOpen, step]);

  const roles: RoleConfig[] = [
    {
      id: 'table',
      title: 'テーブルログイン',
      description: 'テーブルでの注文・指名管理・サービス注文',
      icon: <Tablet className="w-8 h-8" />,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      features: ['テーブル注文', 'キャスト指名', '場内指名', 'サービス注文', 'スタッフ呼び出し']
    },
    {
      id: 'cast',
      title: 'キャスト',
      description: '勤怠管理・給与確認・指名管理・バック率確認',
      icon: <Users className="w-8 h-8" />,
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200 hover:bg-green-100',
      features: ['勤怠管理', '給与確認', '指名管理', 'バック率確認', 'サービス管理']
    },
    {
      id: 'admin',
      title: '店舗管理者',
      description: '売上管理・顧客管理・スタッフ管理・指名管理・システム設定',
      icon: <Settings className="w-8 h-8" />,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      features: ['売上分析', 'レジ締め', 'メニュー管理', '顧客管理', '勤怠承認', '給与計算', 'ボトル管理', 'バック率設定', '指名管理', '注文監視']
    },
    // {
    //   id: 'superadmin',
    //   title: 'システム管理者',
    //   description: '監査ログ・店舗管理・複数店舗統括',
    //   icon: <Shield className="w-8 h-8" />,
    //   color: 'text-orange-700',
    //   bgColor: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    //   features: ['監査ログ', '店舗管理', '複数店舗統括', 'システム設定', '権限管理']
    // }
  ];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    
    if (role === 'table') {
      setStep('table');
    } else {
      setStep('login');
      // cast と admin の場合はモックデータを設定しない
      if (role === 'cast' || role === 'admin') {
        setCredentials({
          email: '',
          password: ''
        });
      } else {
        // スーパー管理者の場合のみデフォルトのテストアカウントを設定
        const defaultAccount = testAccounts[role as 'cast' | 'admin' | 'superadmin'][0];
        setCredentials({
          email: defaultAccount.email,
          password: defaultAccount.password
        });
      }
    }
  };

  const handleTableLogin = async () => {
    if (!tableCredentials.table_id) {
      error('テーブルを選択してください', '利用するテーブルを選択してください。');
      return;
    }

    // 管理者認証モーダルを表示
    setShowAdminAuthModal(true);
    setTimeout(() => setIsModalVisible(true), 10);
  };

  const handleAdminAuth = async () => {
    if (!adminCredentials.email || !adminCredentials.password) {
      error('入力エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminCredentials.email,
          password: adminCredentials.password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // 管理者認証成功後、テーブルログインを実行
        const tableAuth = await loginAsTable({
          table_id: tableCredentials.table_id
        });

        success('テーブルログイン成功', `${tableAuth.table_label}にログインしました`);
        
        onClose();
        
        // Reset form
        setStep('role');
        setSelectedRole(null);
        setTableCredentials({ table_id: '' });
        setAdminCredentials({ email: '', password: '' });
        setShowAdminAuthModal(false);
        
        // テーブル専用ダッシュボードにリダイレクト
        window.location.href = `/table/${tableCredentials.table_id}`;
      } else {
        error('認証に失敗しました', result.error || 'メールアドレスまたはパスワードが正しくありません。');
      }
    } catch (err) {
      error('テーブルログインに失敗しました', 'システムエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      error('入力エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // まず、キャストログインを試行
      let response = await fetch('/api/auth/cast-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

      let result = await response.json();
      
      if (result.success) {
        // キャスト認証情報をローカルストレージに保存
        const castAuth = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          drink_back: result.user.drink_back,
          food_back: result.user.food_back,
          main_nomination: result.user.main_nomination,
          inside_nomination: result.user.inside_nomination,
          login_time: new Date().toISOString()
        };
        
        localStorage.setItem('cast_auth', JSON.stringify(castAuth));
        
        success('ログイン成功', 'キャストとしてログインしました');
        onClose();
        
        // Reset form
        setCredentials({ email: '', password: '' });
        
        // キャストダッシュボードにリダイレクト
        window.location.href = '/cast/dashboard';
        return;
      }

      // キャストログインが失敗した場合、管理者ログインを試行
      response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

      result = await response.json();
      
      if (result.success) {
        // 管理者認証情報をローカルストレージに保存
        const adminAuth = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          login_time: new Date().toISOString()
        };
        
        localStorage.setItem('admin_auth', JSON.stringify(adminAuth));
        
        success('ログイン成功', '管理者としてログインしました');
        onClose();
        
        // Reset form
        setCredentials({ email: '', password: '' });
        
        // ダッシュボードにリダイレクト
        window.location.href = '/dashboard';
        return;
      }

      // 管理者ログインが失敗した場合、テーブルログインを試行
      response = await fetch('/api/auth/table-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

      result = await response.json();
      
      if (result.success) {
        // テーブル管理ユーザー認証情報をローカルストレージに保存
        const tableAuth = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          login_time: new Date().toISOString()
        };
        
        localStorage.setItem('table_auth', JSON.stringify(tableAuth));
        
        success('ログイン成功', 'テーブル管理としてログインしました');
        onClose();
        
        // Reset form
        setCredentials({ email: '', password: '' });
        
        // テーブル一覧ページにリダイレクト
        window.location.href = '/table-list';
        return;
      }

      // すべてのログイン試行が失敗した場合
      error('ログインに失敗しました', 'メールアドレスまたはパスワードが正しくありません。');
      
    } catch (err) {
      console.error('ログインエラー:', err);
      error('ログインに失敗しました', 'システムエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (showAdminAuthModal) {
      setShowAdminAuthModal(false);
    } else {
      setStep('role');
      setSelectedRole(null);
    }
  };

  const handleCloseAdminAuth = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setShowAdminAuthModal(false);
      setAdminCredentials({ email: '', password: '' });
    }, 200);
  };

  const selectedRoleConfig = roles.find(r => r.id === selectedRole);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Wine className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">LNXS</DialogTitle>
              <p className="text-sm text-gray-500">システムにログイン</p>
            </div>
          </div>
        </DialogHeader>

        {step === 'role' && (
          <div className="space-y-6">
            {/* Hero Image */}
            <div className="relative h-32 rounded-lg overflow-hidden mb-6">
              <img 
                src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800&h=200&fit=crop"
                alt="プロフェッショナルなPOSシステム環境"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-pink-900/80"></div>
              <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-xl font-bold mb-1">キャバクラ特化POS</h3>
                <p className="text-sm opacity-90">あなたの役割を選択してください</p>
              </div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">利用者種別</h3>
              <p className="text-gray-600">テーブルログインでキャストが注文を管理し、指名・バック率計算まで最適化されたインターフェースを提供します</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roles.map((role) => (
                <Card 
                  key={role.id} 
                  className={`${role.bgColor} border-2 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1`}
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <CardHeader className="pb-4">
                    {role.id === 'admin' ? (
                      <>
                        <div className="flex items-center space-x-3">
                          <div className={`${role.color}`}>
                            {role.icon}
                          </div>
                          <div>
                            <CardTitle className={`text-lg ${role.color}`}>{role.title}</CardTitle>
                          </div>
                        </div>
                        <CardDescription className="text-sm font-medium text-center w-full mt-1">
                          {role.description}
                        </CardDescription>
                      </>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className={`${role.color}`}>
                          {role.icon}
                        </div>
                        <div>
                          <CardTitle className={`text-lg ${role.color}`}>{role.title}</CardTitle>
                          <CardDescription className="text-sm font-medium">
                            {role.description}
                          </CardDescription>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">主な機能:</p>
                      <div className="flex flex-wrap gap-1">
                        {role.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 'table' && (
          <div className="space-y-6">
            {/* Professional Header */}
            <div className="relative h-24 rounded-lg overflow-hidden mb-6">
              <img 
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&h=150&fit=crop"
                alt="テーブルログイン環境"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-transparent"></div>
              <div className="absolute inset-0 flex items-center px-6">
                <div className="text-white">
                  <h3 className="font-bold text-lg">テーブルログイン</h3>
                  <p className="text-sm opacity-90">テーブルと顧客を選択してください</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <div className="text-blue-700">
                <Tablet className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">テーブルログイン</h3>
                <p className="text-sm text-gray-600">キャストがテーブルで注文を管理、指名・サービス注文まで完結</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table-select">テーブル選択</Label>
                <Select value={tableCredentials.table_id} onValueChange={(value) => setTableCredentials(prev => ({ ...prev, table_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="利用するテーブルを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTables ? (
                      <SelectItem value="loading" disabled>
                        読み込み中...
                      </SelectItem>
                    ) : !tables || tables.length === 0 ? (
                      <SelectItem value="no-tables" disabled>
                        テーブルがありません
                      </SelectItem>
                    ) : (
                      tables.map((table) => (
                        <SelectItem key={table.id} value={table.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{table.name}</span>
                            <Badge variant="outline" className="text-xs ml-2 bg-blue-50 text-blue-700">
                              {table.capacity != null ? `${table.capacity}名` : '定員未設定'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* 選択情報プレビュー */}
            {tableCredentials.table_id && tableCredentials.table_id !== 'loading' && tableCredentials.table_id !== 'no-tables' && tables && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">選択情報</h4>
                <div className="space-y-3">
                  {(() => {
                    const selectedTable = tables.find(table => table.id.toString() === tableCredentials.table_id);
                    return selectedTable && (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{selectedTable.name}</h4>
                            <p className="text-sm text-gray-500">
                              {selectedTable.capacity != null
                                ? `定員: ${selectedTable.capacity}名`
                                : '定員: 未設定'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          利用可能
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">テーブル機能</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• キャストがテーブルに着いてから指名を受ける</li>
                <li>• 場内指名・本指名の選択</li>
                <li>• サービス注文（おしぼり、灰皿交換など）</li>
                <li>• スタッフ呼び出し</li>
              </ul>
            </div> */}

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex-1"
              >
                戻る
              </Button>
              <Button 
                onClick={handleTableLogin}
                disabled={!tableCredentials.table_id || isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>ログイン中...</span>
                  </div>
                ) : (
                  'テーブルログイン'
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                テーブルログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
              </p>
            </div>

            {/* 管理者認証確認モーダル */}
            {showAdminAuthModal && (
              <div className={`fixed inset-0 bg-black bg-opacity-50  flex items-center justify-center z-50 mt-0`}>
                <div className={`bg-white rounded-lg p-6 w-96 max-w-md transition-all box-shadow-lg box-shadow-md duration-200 ring-1 ring-black/10 shadow-lg ${isModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">管理者認証</h3>
                      <p className="text-sm text-gray-600">テーブルログインには管理者権限が必要です</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email-modal" className="text-sm font-medium">
                        管理者メールアドレス
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="admin-email-modal"
                          type="email"
                          placeholder="admin@example.com"
                          value={adminCredentials.email}
                          onChange={(e) => setAdminCredentials(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin-password-modal" className="text-sm font-medium">
                        管理者パスワード
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="admin-password-modal"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="パスワードを入力"
                          value={adminCredentials.password}
                          onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseAdminAuth}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                    <Button 
                      onClick={handleAdminAuth}
                      disabled={!adminCredentials.email || !adminCredentials.password || isLoading}
                      className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>認証中...</span>
                        </div>
                      ) : (
                        '認証してログイン'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {step === 'login' && (
          <div className="space-y-6">
            {/* Professional Header */}
            <div className="relative h-24 rounded-lg overflow-hidden mb-6">
              <img 
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&h=150&fit=crop"
                alt="セキュアなログイン環境"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
              <div className="absolute inset-0 flex items-center px-6">
                <div className="text-white">
                  <h3 className="font-bold text-lg">ログイン</h3>
                  <p className="text-sm opacity-90">メールアドレスとパスワードを入力してください</p>
                </div>
              </div>
            </div>

            {/* テストアカウント一覧
            {selectedRole && selectedRole !== 'table' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">テストアカウント一覧</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {testAccounts[selectedRole as 'cast' | 'admin' | 'superadmin']?.map((account, index) => (
                    <button
                      key={index}
                      onClick={() => setCredentials({ email: account.email, password: account.password })}
                      className="text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm text-blue-900">{account.name}</div>
                      <div className="text-xs text-blue-700">{account.email}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  ※ クリックで自動入力されます。パスワードは全て「password」です。
                </p>
              </div>
            )} */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  メールアドレス
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={credentials.email}
                    onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  パスワード
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="パスワードを入力"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">システム機能</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• テーブルログインシステム</li>
                <li>• 本指名・場内指名管理</li>
                <li>• バック率自動計算</li>
                <li>• リアルタイム注文監視</li>
              </ul>
            </div> */}

            <div className="flex space-x-3">
              <Button 
                onClick={handleLogin}
                disabled={!credentials.email || !credentials.password || isLoading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>ログイン中...</span>
                  </div>
                ) : (
                  'ログイン'
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}