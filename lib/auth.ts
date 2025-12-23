// 認証・権限管理
import { mockStaff, Staff } from './mock-data';

// NOTE:
// - DB側のロールは 'admin' | 'cast' | 'manager' | 'super_admin'
// - 旧実装では 'superadmin' が使われている箇所があるため互換で残す
export type UserRole = 'cast' | 'admin' | 'manager' | 'super_admin' | 'superadmin';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  roles: UserRole[];
  store_id: string;
  staff?: Staff;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

// ログイン用のテストアカウント情報
export const testAccounts = {
  cast: [
    { email: 'tanaka@example.com', password: 'password', name: '田中美咲' },
    { email: 'sato@example.com', password: 'password', name: '佐藤花音' },
    { email: 'suzuki@example.com', password: 'password', name: '鈴木愛美' },
    { email: 'takahashi@example.com', password: 'password', name: '高橋麻衣' },
    { email: 'watanabe@example.com', password: 'password', name: '渡辺優香' },
    { email: 'nakamura@example.com', password: 'password', name: '中村彩乃' }
  ],
  admin: [
    { email: 'yamada@example.com', password: 'password', name: '山田店長' },
    { email: 'ito@example.com', password: 'password', name: '伊藤副店長' },
    { email: 'kobayashi@example.com', password: 'password', name: '小林店長' }
  ],
  superadmin: [
    { email: 'system@example.com', password: 'password', name: 'システム管理者' },
    { email: 'tech@example.com', password: 'password', name: '技術責任者' }
  ],
  // 互換: DBロール(super_admin)を旧UIロール(superadmin)と同一扱いにする
  super_admin: [
    { email: 'system@example.com', password: 'password', name: 'システム管理者' },
    { email: 'tech@example.com', password: 'password', name: '技術責任者' }
  ]
};
// セッション管理（将来はJWT/セッションストレージに置き換え）
let currentUser: AuthUser | null = null;

export const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
  // モック認証 - 実際のAPIでは認証サーバーとの通信
  await new Promise(resolve => setTimeout(resolve, 1000)); // API遅延シミュレート
  
  // テストアカウントでの認証
  const roleAccounts =
    // super_admin は superadmin と同一扱い
    (credentials.role === 'super_admin' ? testAccounts.super_admin : (testAccounts as any)[credentials.role]) ||
    testAccounts.cast;
  const account = roleAccounts.find((acc: { email: string }) => acc.email === credentials.email);
  
  if (!account || credentials.password !== 'password') {
    throw new Error('認証に失敗しました。正しいメールアドレスとパスワードを入力してください。');
  }
  
  let user: AuthUser;
  
  // キャスト・管理者・システム管理者の場合
  const staff = mockStaff.find(s => s.email === credentials.email);
  if (!staff) {
    throw new Error('スタッフ情報が見つかりません');
  }
  
  user = {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    roles: staff.roles as UserRole[],
    store_id: staff.store_id,
    staff
  };
  
  currentUser = user;
  
  // ローカルストレージに保存（実装時はセキュアな方法に置き換え）
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
  
  return user;
};

export const logout = async (): Promise<void> => {
  currentUser = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_user');
  }
};

export const getCurrentUser = (): AuthUser | null => {
  if (currentUser) return currentUser;
  
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      currentUser = JSON.parse(stored);
      return currentUser;
    }
  }
  
  return null;
};

export const hasRole = (user: AuthUser | null, role: UserRole): boolean => {
  if (!user) return false;

  const roles = user.roles || [];

  // super_admin / superadmin は全権限（互換）
  const isSuper = roles.includes('super_admin') || roles.includes('superadmin');
  if (isSuper) {
    // super は任意ロール要求を満たす扱い
    return true;
  }

  // admin要求はadminのみ（superは上で処理済み）
  if (role === 'admin') return roles.includes('admin');

  // super系要求はどちらでも満たす
  if (role === 'super_admin' || role === 'superadmin') {
    return roles.includes('super_admin') || roles.includes('superadmin');
  }

  return roles.includes(role);
};

export const hasAnyRole = (user: AuthUser | null, roles: UserRole[]): boolean => {
  return roles.some(role => hasRole(user, role));
};

// 権限チェック関数
export const canAccessRoute = (user: AuthUser | null, route: string): boolean => {
  if (!user) return false;
  
  // ルートベースの権限チェック
  if (route.startsWith('/cast/')) {
    return hasAnyRole(user, ['cast', 'admin', 'super_admin', 'superadmin']);
  }
  
  if (route.startsWith('/admin/')) {
    return hasAnyRole(user, ['admin', 'super_admin', 'superadmin']);
  }
  
  if (route.startsWith('/super/')) {
    return hasAnyRole(user, ['super_admin', 'superadmin']);
  }
  
  return true;
};

// 操作権限チェック
export const canPerformAction = (user: AuthUser | null, action: string): boolean => {
  if (!user) return false;
  
  const permissions: Record<UserRole, string[]> = {
    cast: [
      'view_menu', 'create_order', 'modify_order', 'process_payment',
      'view_attendance', 'create_attendance', 'view_own_payroll',
      'manage_customers', 'manage_tables', 'manage_sessions', 'manage_bottles',
      'view_sales', 'process_service_requests'
    ],
    admin: [
      'view_menu', 'create_order', 'modify_order', 'process_payment',
      'view_attendance', 'create_attendance', 'modify_attendance', 'approve_attendance',
      'view_payroll', 'process_payroll', 'view_sales', 'manage_inventory',
      'manage_customers', 'manage_settings', 'close_register', 'process_refund',
      'manage_tables', 'manage_sessions', 'manage_bottles', 'process_service_requests'
    ],
    manager: [
      // manager権限は現状adminに近い運用を想定（必要に応じて絞る）
      'view_menu', 'create_order', 'modify_order', 'process_payment',
      'view_attendance', 'create_attendance', 'modify_attendance', 'approve_attendance',
      'view_payroll', 'process_payroll', 'view_sales', 'manage_inventory',
      'manage_customers', 'manage_settings', 'close_register', 'process_refund',
      'manage_tables', 'manage_sessions', 'manage_bottles', 'process_service_requests'
    ],
    super_admin: ['*'], // 全権限（DB）
    superadmin: ['*'] // 全権限（旧互換）
  };
  
  return user.roles.some(role => {
    const rolePermissions = permissions[role];
    return rolePermissions.includes('*') || rolePermissions.includes(action);
  });
};