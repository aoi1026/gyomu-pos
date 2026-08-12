'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, hasAnyRole, canAccessRoute, UserRole } from '@/lib/auth';
import { Spinner } from '@/components/ui/spinner';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredRoute?: string;
  fallback?: React.ReactNode;
}

export default function RoleGate({ 
  children, 
  allowedRoles, 
  requiredRoute,
  fallback 
}: RoleGateProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = () => {
      let user = getCurrentUser();
      
      // 管理者認証も確認
      if (!user && typeof window !== 'undefined') {
        const adminAuth = localStorage.getItem('admin_auth');
        if (adminAuth) {
          try {
            const parsedAdminAuth = JSON.parse(adminAuth);
            console.log('RoleGate: 管理者認証情報を発見:', parsedAdminAuth);
            // 管理者認証情報をAuthUser形式に変換
            const role = parsedAdminAuth.role || 'admin';
            user = {
              id: parsedAdminAuth.id || '1',
              name: parsedAdminAuth.name || '管理者',
              email: parsedAdminAuth.email,
              roles: [role] as UserRole[],
              store_id: parsedAdminAuth.store_id || '1'
            };
            console.log('RoleGate: 変換されたユーザー情報:', user);
          } catch (error) {
            console.error('管理者認証情報の解析に失敗しました:', error);
          }
        }
        
        // キャスト認証も確認
        if (!user) {
          const castAuth = localStorage.getItem('cast_auth');
          if (castAuth) {
            try {
              const parsedCastAuth = JSON.parse(castAuth);
              // キャスト認証情報をAuthUser形式に変換
              const role = parsedCastAuth.role || 'cast';
              user = {
                id: parsedCastAuth.id || '1',
                name: parsedCastAuth.name || 'キャスト',
                email: parsedCastAuth.email,
                roles: [role] as UserRole[],
                store_id: '1'
              };
            } catch (error) {
              console.error('キャスト認証情報の解析に失敗しました:', error);
            }
          }
        }
      }
      
      if (!user) {
        console.log('RoleGate: ユーザー認証情報が見つかりません');
        // ルートや許可ロールから適切なログインページへ誘導
        const target =
          (requiredRoute && requiredRoute.startsWith('/cast/')) ||
          (allowedRoles && allowedRoles.includes('cast') && !allowedRoles.includes('admin'))
            ? '/cast-login'
            : '/admin-login';
        router.push(target);
        return;
      }

      console.log('RoleGate: 認証されたユーザー:', user);
      console.log('RoleGate: 許可されたロール:', allowedRoles);

      let access = true;

      // ロールベースのチェック
      if (allowedRoles && allowedRoles.length > 0) {
        access = hasAnyRole(user, allowedRoles);
        console.log('RoleGate: ロールチェック結果:', access);
      }

      // ルートベースのチェック
      if (requiredRoute) {
        access = access && canAccessRoute(user, requiredRoute);
        console.log('RoleGate: ルートチェック結果:', access);
      }

      console.log('RoleGate: 最終アクセス結果:', access);
      setHasAccess(access);
      setIsLoading(false);

      if (!access && fallback === undefined) {
        console.log('RoleGate: アクセス拒否、ダッシュボードにリダイレクト');
        router.push('/dashboard');
      }
    };

    checkAccess();
  }, [allowedRoles, requiredRoute, router, fallback]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!hasAccess) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス権限がありません</h1>
          <p className="text-gray-600">この機能を利用する権限がありません。</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}