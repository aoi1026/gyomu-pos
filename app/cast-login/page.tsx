'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wine, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

export default function CastLoginPage() {
  const { success, error } = useNotificationContext();
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  // 既にログイン済みなら自動でキャストダッシュボードへ遷移
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('cast_auth') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          window.location.href = '/cast/dashboard';
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cast_auth');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      error('入力エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/cast-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      });
      const result = await response.json();

      if (result.success) {
        const castAuth = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          drink_back: result.user.drink_back,
          food_back: result.user.food_back,
          main_nomination: result.user.main_nomination,
          inside_nomination: result.user.inside_nomination,
          login_time: new Date().toISOString(),
        };
        localStorage.setItem('cast_auth', JSON.stringify(castAuth));
        success('ログイン成功', 'キャストとしてログインしました');
        window.location.href = '/cast/dashboard';
        return;
      }

      error('ログインに失敗しました', 'メールアドレスまたはパスワードが正しくありません。');
    } catch (err) {
      console.error('キャストログインエラー:', err);
      error('ログインに失敗しました', 'システムエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左半分: 画像（角丸なし） */}
      <div className="hidden md:block w-1/2 relative bg-gray-900">
        <Image
          src="/assets/cast-login.jpg"
          alt="キャストログイン"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
      </div>

      {/* 右半分: フォーム（角丸なし） */}
      <div className="w-full md:w-1/2 flex flex-col bg-white relative min-h-screen">
        <div className="absolute top-0 right-0 p-6 sm:p-8 lg:p-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            トップに戻る
          </Link>
        </div>

        {/* 右半分の中央 */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 -mt-20">
          <div className="w-full max-w-sm text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 bg-gray-900 flex items-center justify-center rounded-none">
                <Wine className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">LNXS</h1>
            <p className="text-sm text-gray-500 mt-1">キャスト専用ログイン</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                メールアドレス
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="cast@example.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                  className="pl-10 h-11 border-gray-300 rounded-none"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                パスワード
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワードを入力"
                  value={credentials.password}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                  className="pl-10 pr-10 h-11 border-gray-300 rounded-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!credentials.email || !credentials.password || isLoading}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-auto py-6 text-center text-xs text-gray-500 px-6">
          ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
        </p>
      </div>
    </div>
  );
}

