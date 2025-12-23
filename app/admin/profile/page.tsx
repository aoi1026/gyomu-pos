'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const router = useRouter();
  const { success, error, info } = useNotificationContext();

  useEffect(() => {
    // 管理者認証情報を優先
    const adminAuth = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') : null;
    if (adminAuth) {
      try {
        const parsed = JSON.parse(adminAuth);
        setUser(parsed);
        setName(parsed.name || '');
        setEmail(parsed.email || '');
        setIsLoading(false);
        return;
      } catch (e) {
        console.error('admin_auth parse error', e);
        localStorage.removeItem('admin_auth');
      }
    }

    // 従来の認証にもフォールバック
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setIsLoading(false);
  }, [router]);

  const handleSaveEmail = async () => {
    if (!name || !email) {
      error('入力エラー', '名前とメールアドレスを入力してください。');
      return;
    }
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/admins/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mail: email })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || '更新に失敗しました');
      }
      // ローカルの認証情報を更新
      const updated = { ...user, name: result.data.name, email: result.data.mail };
      if (typeof window !== 'undefined' && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin')) {
        localStorage.setItem('admin_auth', JSON.stringify(updated));
      }
      setUser(updated);
      success('更新成功', 'メールアドレスを更新しました。');
    } catch (e: any) {
      error('エラー', e.message || '更新に失敗しました');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      error('入力エラー', '新しいパスワードを入力してください。');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('不一致', 'パスワードが一致しません。');
      return;
    }
    if (newPassword.length < 6) {
      error('弱いパスワード', '6文字以上のパスワードを設定してください。');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admins/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mail: email, password: newPassword })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'パスワード更新に失敗しました');
      }
      setNewPassword('');
      setConfirmPassword('');
      success('更新成功', 'パスワードを更新しました。');
      info('セキュリティ', '再ログインをおすすめします。', 4000);
    } catch (e: any) {
      error('エラー', e.message || 'パスワード更新に失敗しました');
    } finally {
      setSavingPassword(false);
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
    <RoleGate allowedRoles={['admin', 'super_admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ダッシュボード
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">管理者情報管理</h1>
                  <p className="text-xs sm:text-sm text-gray-500">名前・メール・パスワードの更新</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm">
                {user?.name}
              </Badge>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Email/Name Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center"><Mail className="w-5 h-5 mr-2" />名前・メールアドレスの更新</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名前</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="お名前" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveEmail} disabled={savingEmail} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  {savingEmail ? '更新中...' : '保存する'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center"><Lock className="w-5 h-5 mr-2" />パスワードの更新</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">新しいパスワード</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="新しいパスワード" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="もう一度入力" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={savingPassword} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  {savingPassword ? '更新中...' : '変更する'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}


