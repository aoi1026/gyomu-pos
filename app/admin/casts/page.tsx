'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Users, Plus, Edit, Trash2, Save, X, 
  UserPlus, Mail, Calendar, FileText
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface CastData {
  id: number;
  name: string;
  mail: string;
  other: string | null;
  gender: string | null;
  created_at: string;
}

interface AdminData {
  id: number;
  name: string;
  mail: string;
  other: string | null;
  gender: string | null;
  created_at: string;
}

interface TableUserData {
  id: number;
  name: string;
  mail: string;
  other: string | null;
  gender: string | null;
  created_at: string;
}

export default function CastsPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'admins' | 'tables'>('staff');

  const [casts, setCasts] = useState<CastData[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCast, setEditingCast] = useState<CastData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCastId, setDeleteCastId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [addForm, setAddForm] = useState({
    name: '',
    mail: '',
    password: '',
    other: '',
    gender: ''
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    mail: '',
    password: '',
    other: '',
    gender: ''
  });

  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [isEditAdminDialogOpen, setIsEditAdminDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminData | null>(null);
  const [deleteAdminId, setDeleteAdminId] = useState<number | null>(null);
  const [isDeleteAdminDialogOpen, setIsDeleteAdminDialogOpen] = useState(false);

  const [tableUsers, setTableUsers] = useState<TableUserData[]>([]);
  const [isAddTableUserDialogOpen, setIsAddTableUserDialogOpen] = useState(false);
  const [isEditTableUserDialogOpen, setIsEditTableUserDialogOpen] = useState(false);
  const [editingTableUser, setEditingTableUser] = useState<TableUserData | null>(null);
  const [deleteTableUserId, setDeleteTableUserId] = useState<number | null>(null);
  const [isDeleteTableUserDialogOpen, setIsDeleteTableUserDialogOpen] = useState(false);

  const [addAdminForm, setAddAdminForm] = useState({
    name: '',
    mail: '',
    password: '',
    other: '',
    gender: ''
  });

  const [editAdminForm, setEditAdminForm] = useState({
    name: '',
    mail: '',
    password: '',
    other: '',
    gender: ''
  });

  const [addTableUserForm, setAddTableUserForm] = useState({
    name: '',
    mail: '',
    password: '',
    other: '',
    gender: ''
  });

  const [editTableUserForm, setEditTableUserForm] = useState({
    name: '',
    mail: '',
    password: '',
    other: '',
    gender: ''
  });

  const router = useRouter();
  const { success, error } = useNotificationContext();
  const isSuperAdmin = adminUser?.role === 'super_admin' || adminUser?.role === 'superadmin';

  useEffect(() => {
    // 管理者認証情報を確認
    const adminAuth = localStorage.getItem('admin_auth');
    if (adminAuth) {
      try {
        const parsedAdminAuth = JSON.parse(adminAuth);
        setAdminUser(parsedAdminAuth);
        setIsLoading(false);
        fetchCasts();
        fetchAdmins();
        fetchTableUsers();
        return;
      } catch (err) {
        console.error('管理者認証情報の解析に失敗しました:', err);
        localStorage.removeItem('admin_auth');
      }
    }
    
    // 管理者認証情報がない場合はログインページにリダイレクト
    router.push('/admin-login');
  }, [router]);

  const fetchCasts = async () => {
    try {
      const response = await fetch('/api/casts');
      const result = await response.json();
      if (result.success) {
        setCasts(result.data);
      } else {
        error('エラー', 'スタッフ一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('スタッフ一覧取得エラー:', err);
      error('エラー', 'スタッフ一覧の取得に失敗しました');
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admins');
      const result = await response.json();
      if (result.success) {
        setAdmins(result.data);
      } else {
        error('エラー', '管理者一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('管理者一覧取得エラー:', err);
      error('エラー', '管理者一覧の取得に失敗しました');
    }
  };

  const fetchTableUsers = async () => {
    try {
      const response = await fetch('/api/table-users');
      const result = await response.json();
      if (result.success) {
        setTableUsers(result.data);
      } else {
        error('エラー', 'テーブル管理ユーザー一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('テーブル管理ユーザー一覧取得エラー:', err);
      error('エラー', 'テーブル管理ユーザー一覧の取得に失敗しました');
    }
  };

  const handleAdd = () => {
    setAddForm({ name: '', mail: '', password: '', other: '', gender: '' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (cast: CastData) => {
    setEditingCast(cast);
    setEditForm({
      name: cast.name,
      mail: cast.mail,
      password: '', // パスワードは空で開始
      other: cast.other || '',
      gender: cast.gender || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (castId: number) => {
    setDeleteCastId(castId);
    setIsDeleteDialogOpen(true);
  };

  const handleAddAdmin = () => {
    setAddAdminForm({ name: '', mail: '', password: '', other: '', gender: '' });
    setIsAddAdminDialogOpen(true);
  };

  const handleEditAdmin = (admin: AdminData) => {
    setEditingAdmin(admin);
    setEditAdminForm({
      name: admin.name,
      mail: admin.mail,
      password: '',
      other: admin.other || '',
      gender: admin.gender || ''
    });
    setIsEditAdminDialogOpen(true);
  };

  const handleDeleteAdmin = (adminId: number) => {
    setDeleteAdminId(adminId);
    setIsDeleteAdminDialogOpen(true);
  };

  const handleAddForActiveTab = () => {
    if (activeTab === 'staff' || !isSuperAdmin) {
      handleAdd();
    } else if (activeTab === 'admins') {
      handleAddAdmin();
    } else if (activeTab === 'tables') {
      handleAddTableUser();
    }
  };

  const handleAddTableUser = () => {
    setAddTableUserForm({ name: '', mail: '', password: '', other: '', gender: '' });
    setIsAddTableUserDialogOpen(true);
  };

  const handleEditTableUser = (tableUser: TableUserData) => {
    setEditingTableUser(tableUser);
    setEditTableUserForm({
      name: tableUser.name,
      mail: tableUser.mail,
      password: '',
      other: tableUser.other || '',
      gender: tableUser.gender || ''
    });
    setIsEditTableUserDialogOpen(true);
  };

  const handleDeleteTableUser = (tableUserId: number) => {
    setDeleteTableUserId(tableUserId);
    setIsDeleteTableUserDialogOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!addForm.name || !addForm.mail || !addForm.password) {
      error('エラー', '名前、メールアドレス、パスワードを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/casts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });

      const result = await response.json();
      if (result.success) {
        success('追加完了', 'スタッフが正常に追加されました');
        setIsAddDialogOpen(false);
        setAddForm({ name: '', mail: '', password: '', other: '', gender: '' });
        fetchCasts();
      } else {
        error('エラー', result.error || 'スタッフの追加に失敗しました');
      }
    } catch (err) {
      console.error('スタッフ追加エラー:', err);
      error('エラー', 'スタッフの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.mail) {
      error('エラー', '名前とメールアドレスを入力してください');
      return;
    }

    if (!editingCast) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/casts/${editingCast.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const result = await response.json();
      if (result.success) {
        success('更新完了', 'スタッフ情報が正常に更新されました');
        setIsEditDialogOpen(false);
        setEditingCast(null);
        fetchCasts();
      } else {
        error('エラー', result.error || 'スタッフの更新に失敗しました');
      }
    } catch (err) {
      console.error('スタッフ更新エラー:', err);
      error('エラー', 'スタッフの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCastId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/casts/${deleteCastId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        success('削除完了', 'スタッフが正常に削除されました');
        setIsDeleteDialogOpen(false);
        setDeleteCastId(null);
        fetchCasts();
      } else {
        error('エラー', result.error || 'スタッフの削除に失敗しました');
      }
    } catch (err) {
      console.error('スタッフ削除エラー:', err);
      error('エラー', 'スタッフの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAddAdmin = async () => {
    if (!addAdminForm.name || !addAdminForm.mail || !addAdminForm.password) {
      error('エラー', '管理者名、管理者メール、パスワードを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addAdminForm)
      });

      const result = await response.json();
      if (result.success) {
        success('登録完了', '管理者が正常に登録されました');
        setIsAddAdminDialogOpen(false);
        setAddAdminForm({ name: '', mail: '', password: '', other: '', gender: '' });
        fetchAdmins();
      } else {
        error('エラー', result.error || '管理者の登録に失敗しました');
      }
    } catch (err) {
      console.error('管理者登録エラー:', err);
      error('エラー', '管理者の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditAdmin = async () => {
    if (!editAdminForm.name || !editAdminForm.mail) {
      error('エラー', '管理者名と管理者メールを入力してください');
      return;
    }

    if (!editingAdmin) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admins/${editingAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editAdminForm)
      });

      const result = await response.json();
      if (result.success) {
        success('変更完了', '管理者情報が正常に変更されました');
        setIsEditAdminDialogOpen(false);
        setEditingAdmin(null);
        fetchAdmins();
      } else {
        error('エラー', result.error || '管理者情報の変更に失敗しました');
      }
    } catch (err) {
      console.error('管理者変更エラー:', err);
      error('エラー', '管理者情報の変更に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!deleteAdminId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admins/${deleteAdminId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        success('削除完了', '管理者が正常に削除されました');
        setIsDeleteAdminDialogOpen(false);
        setDeleteAdminId(null);
        fetchAdmins();
      } else {
        error('エラー', result.error || '管理者の削除に失敗しました');
      }
    } catch (err) {
      console.error('管理者削除エラー:', err);
      error('エラー', '管理者の削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAddTableUser = async () => {
    if (!addTableUserForm.name || !addTableUserForm.mail || !addTableUserForm.password) {
      error('エラー', '名前、メールアドレス、パスワードを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/table-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addTableUserForm)
      });

      const result = await response.json();
      if (result.success) {
        success('追加完了', 'テーブル管理ユーザーが正常に追加されました');
        setIsAddTableUserDialogOpen(false);
        setAddTableUserForm({ name: '', mail: '', password: '', other: '', gender: '' });
        fetchTableUsers();
      } else {
        error('エラー', result.error || 'テーブル管理ユーザーの追加に失敗しました');
      }
    } catch (err) {
      console.error('テーブル管理ユーザー追加エラー:', err);
      error('エラー', 'テーブル管理ユーザーの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditTableUser = async () => {
    if (!editTableUserForm.name || !editTableUserForm.mail) {
      error('エラー', '名前とメールアドレスを入力してください');
      return;
    }

    if (!editingTableUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/table-users/${editingTableUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTableUserForm)
      });

      const result = await response.json();
      if (result.success) {
        success('更新完了', 'テーブル管理ユーザー情報が正常に更新されました');
        setIsEditTableUserDialogOpen(false);
        setEditingTableUser(null);
        fetchTableUsers();
      } else {
        error('エラー', result.error || 'テーブル管理ユーザーの更新に失敗しました');
      }
    } catch (err) {
      console.error('テーブル管理ユーザー更新エラー:', err);
      error('エラー', 'テーブル管理ユーザーの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteTableUser = async () => {
    if (!deleteTableUserId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/table-users/${deleteTableUserId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        success('削除完了', 'テーブル管理ユーザーが正常に削除されました');
        setIsDeleteTableUserDialogOpen(false);
        setDeleteTableUserId(null);
        fetchTableUsers();
      } else {
        error('エラー', result.error || 'テーブル管理ユーザーの削除に失敗しました');
      }
    } catch (err) {
      console.error('テーブル管理ユーザー削除エラー:', err);
      error('エラー', 'テーブル管理ユーザーの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminUser) return null;

  return (
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">スタッフ管理</h1>
                <p className="text-xs sm:text-sm text-gray-500">スタッフ・管理者の登録/変更/削除</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleAddForActiveTab} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'staff' ? 'スタッフ追加' : activeTab === 'admins' ? '管理者登録' : 'テーブル管理ユーザー追加'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 説明カード */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-800">
              <Users className="w-5 h-5 mr-2" />
              スタッフ管理
            </CardTitle>
            <CardDescription>
              スタッフ（キャスト）と管理者の登録、変更、削除を行います。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>登録</span>
              </div>
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-green-600" />
                <span>変更</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>削除</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={isSuperAdmin ? activeTab : 'staff'}
          onValueChange={(v) => {
            if ((v === 'admins' || v === 'tables') && !isSuperAdmin) {
              error('権限エラー', '管理者登録表とテーブル管理にアクセスできるのはスーパー管理者のみです');
              return;
            }
            setActiveTab(v as 'staff' | 'admins' | 'tables');
          }}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="staff">スタッフ</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="admins">管理者</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="tables">テーブル管理</TabsTrigger>}
          </TabsList>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    スタッフ一覧
                  </span>
                  <Badge variant="outline" className="text-sm">
                    {casts.length}名
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {casts.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">スタッフが登録されていません</p>
                    <Button onClick={handleAdd} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      スタッフを追加
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>スタッフ名</TableHead>
                          <TableHead>メールアドレス</TableHead>
                          <TableHead>性別</TableHead>
                          <TableHead>備考</TableHead>
                          <TableHead>登録日時</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {casts.map((cast, index) => (
                          <TableRow key={cast.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                                  <Users className="w-4 h-4 text-pink-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{cast.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{cast.mail}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {cast.gender ? (
                                <Badge variant="secondary" className={
                                  cast.gender === 'male' ? 'bg-blue-100 text-blue-800' :
                                  cast.gender === 'female' ? 'bg-pink-100 text-pink-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {cast.gender === 'male' ? '男性' :
                                   cast.gender === 'female' ? '女性' :
                                   cast.gender === 'other' ? 'その他' : cast.gender}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {cast.other && String(cast.other).trim() ? (
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm">{String(cast.other)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{formatDate(cast.created_at)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(cast)}>
                                  <Edit className="w-4 h-4 mr-1" />
                                  編集
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(cast.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  削除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    管理者登録表
                  </span>
                  <Badge variant="outline" className="text-sm">
                    {admins.length}名
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {admins.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">管理者が登録されていません</p>
                    <Button onClick={handleAddAdmin} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      管理者を登録
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>番号</TableHead>
                          <TableHead>管理者名</TableHead>
                          <TableHead>管理者メール</TableHead>
                            <TableHead>性別</TableHead>
                          <TableHead>備考</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admins.map((admin, index) => (
                          <TableRow key={admin.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{admin.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{admin.mail}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                                {admin.gender ? (
                                  <Badge variant="secondary" className={
                                    admin.gender === 'male' ? 'bg-blue-100 text-blue-800' :
                                    admin.gender === 'female' ? 'bg-pink-100 text-pink-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {admin.gender === 'male' ? '男性' :
                                     admin.gender === 'female' ? '女性' :
                                     admin.gender === 'other' ? 'その他' : admin.gender}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {admin.other && String(admin.other).trim() ? (
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">{String(admin.other)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex space-x-2 justify-center">
                                <Button size="sm" variant="outline" onClick={() => handleEditAdmin(admin)}>
                                  <Edit className="w-4 h-4 mr-1" />
                                  変更
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  削除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="tables">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      テーブル管理ユーザー登録表
                    </span>
                    <Badge variant="outline" className="text-sm">
                      {tableUsers.length}名
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tableUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">テーブル管理ユーザーが登録されていません</p>
                      <Button onClick={handleAddTableUser} className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />
                        テーブル管理ユーザーを登録
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>番号</TableHead>
                            <TableHead>管理者名</TableHead>
                            <TableHead>管理者メール</TableHead>
                            <TableHead>性別</TableHead>
                            <TableHead>備考</TableHead>
                            <TableHead className="text-center">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableUsers.map((tableUser, index) => (
                            <TableRow key={tableUser.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{tableUser.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm">{tableUser.mail}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {tableUser.gender ? (
                                  <Badge variant="secondary" className={
                                    tableUser.gender === 'male' ? 'bg-blue-100 text-blue-800' :
                                    tableUser.gender === 'female' ? 'bg-pink-100 text-pink-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {tableUser.gender === 'male' ? '男性' :
                                     tableUser.gender === 'female' ? '女性' :
                                     tableUser.gender === 'other' ? 'その他' : tableUser.gender}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {tableUser.other && String(tableUser.other).trim() ? (
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">{String(tableUser.other)}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex space-x-2 justify-center">
                                  <Button size="sm" variant="outline" onClick={() => handleEditTableUser(tableUser)}>
                                    <Edit className="w-4 h-4 mr-1" />
                                    変更
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteTableUser(tableUser.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    削除
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* スタッフ追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              スタッフ追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">スタッフ名 *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="スタッフ名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-mail">メールアドレス *</Label>
              <Input
                id="add-mail"
                type="email"
                value={addForm.mail}
                onChange={(e) => setAddForm(prev => ({ ...prev, mail: e.target.value }))}
                placeholder="メールアドレスを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">パスワード *</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="パスワードを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-gender">性別</Label>
              <Select
                value={addForm.gender}
                onValueChange={(value) => setAddForm(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger id="add-gender">
                  <SelectValue placeholder="性別を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-other">備考</Label>
              <Input
                id="add-other"
                value={addForm.other}
                onChange={(e) => setAddForm(prev => ({ ...prev, other: e.target.value }))}
                placeholder="備考を入力（任意）"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSaveAdd} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '追加中...' : '追加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* スタッフ編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              スタッフ編集
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">スタッフ名 *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="スタッフ名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mail">メールアドレス *</Label>
              <Input
                id="edit-mail"
                type="email"
                value={editForm.mail}
                onChange={(e) => setEditForm(prev => ({ ...prev, mail: e.target.value }))}
                placeholder="メールアドレスを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">パスワード</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="新しいパスワード（変更する場合のみ）"
              />
              <p className="text-xs text-gray-500">空の場合は現在のパスワードを維持します</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">性別</Label>
              <Select
                value={editForm.gender}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger id="edit-gender">
                  <SelectValue placeholder="性別を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-other">備考</Label>
              <Input
                id="edit-other"
                value={editForm.other}
                onChange={(e) => setEditForm(prev => ({ ...prev, other: e.target.value }))}
                placeholder="備考を入力（任意）"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '更新中...' : '更新'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スタッフ削除</AlertDialogTitle>
            <AlertDialogDescription>
              このスタッフを削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 管理者登録ダイアログ */}
      <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              管理者登録
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-admin-name">管理者名 *</Label>
              <Input
                id="add-admin-name"
                value={addAdminForm.name}
                onChange={(e) => setAddAdminForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="管理者名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-admin-mail">管理者メール *</Label>
              <Input
                id="add-admin-mail"
                type="email"
                value={addAdminForm.mail}
                onChange={(e) => setAddAdminForm(prev => ({ ...prev, mail: e.target.value }))}
                placeholder="管理者メールを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-admin-password">パスワード *</Label>
              <Input
                id="add-admin-password"
                type="password"
                value={addAdminForm.password}
                onChange={(e) => setAddAdminForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="パスワードを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-admin-gender">性別</Label>
              <Select
                value={addAdminForm.gender}
                onValueChange={(value) => setAddAdminForm(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger id="add-admin-gender">
                  <SelectValue placeholder="性別を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-admin-other">備考</Label>
              <Input
                id="add-admin-other"
                value={addAdminForm.other}
                onChange={(e) => setAddAdminForm(prev => ({ ...prev, other: e.target.value }))}
                placeholder="備考を入力（任意）"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddAdminDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSaveAddAdmin} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '登録中...' : '登録'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 管理者変更ダイアログ */}
      <Dialog open={isEditAdminDialogOpen} onOpenChange={setIsEditAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              管理者変更
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-admin-name">管理者名 *</Label>
              <Input
                id="edit-admin-name"
                value={editAdminForm.name}
                onChange={(e) => setEditAdminForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="管理者名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admin-mail">管理者メール *</Label>
              <Input
                id="edit-admin-mail"
                type="email"
                value={editAdminForm.mail}
                onChange={(e) => setEditAdminForm(prev => ({ ...prev, mail: e.target.value }))}
                placeholder="管理者メールを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admin-password">パスワード</Label>
              <Input
                id="edit-admin-password"
                type="password"
                value={editAdminForm.password}
                onChange={(e) => setEditAdminForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="新しいパスワード（変更する場合のみ）"
              />
              <p className="text-xs text-gray-500">空の場合は現在のパスワードを維持します</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admin-gender">性別</Label>
              <Select
                value={editAdminForm.gender}
                onValueChange={(value) => setEditAdminForm(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger id="edit-admin-gender">
                  <SelectValue placeholder="性別を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admin-other">備考</Label>
              <Input
                id="edit-admin-other"
                value={editAdminForm.other}
                onChange={(e) => setEditAdminForm(prev => ({ ...prev, other: e.target.value }))}
                placeholder="備考を入力（任意）"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditAdminDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSaveEditAdmin} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '変更中...' : '変更'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 管理者削除確認ダイアログ */}
      <AlertDialog open={isDeleteAdminDialogOpen} onOpenChange={setIsDeleteAdminDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>管理者削除</AlertDialogTitle>
            <AlertDialogDescription>
              この管理者を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAdmin}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* テーブル管理ユーザー追加ダイアログ */}
      <Dialog open={isAddTableUserDialogOpen} onOpenChange={setIsAddTableUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              テーブル管理ユーザー追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-table-user-name">名前 *</Label>
              <Input
                id="add-table-user-name"
                value={addTableUserForm.name}
                onChange={(e) => setAddTableUserForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="名前を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-table-user-mail">メールアドレス *</Label>
              <Input
                id="add-table-user-mail"
                type="email"
                value={addTableUserForm.mail}
                onChange={(e) => setAddTableUserForm(prev => ({ ...prev, mail: e.target.value }))}
                placeholder="メールアドレスを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-table-user-password">パスワード *</Label>
              <Input
                id="add-table-user-password"
                type="password"
                value={addTableUserForm.password}
                onChange={(e) => setAddTableUserForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="パスワードを入力"
              />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="add-table-user-gender">性別</Label>
              <Select
                value={addTableUserForm.gender}
                onValueChange={(value) => setAddTableUserForm(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger id="add-table-user-gender">
                  <SelectValue placeholder="性別を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="add-table-user-other">備考</Label>
              <Input
                id="add-table-user-other"
                value={addTableUserForm.other}
                onChange={(e) => setAddTableUserForm(prev => ({ ...prev, other: e.target.value }))}
                placeholder="備考を入力（任意）"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddTableUserDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSaveAddTableUser} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '追加中...' : '追加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* テーブル管理ユーザー編集ダイアログ */}
      <Dialog open={isEditTableUserDialogOpen} onOpenChange={setIsEditTableUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              テーブル管理ユーザー編集
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-table-user-name">名前 *</Label>
              <Input
                id="edit-table-user-name"
                value={editTableUserForm.name}
                onChange={(e) => setEditTableUserForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="名前を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-table-user-mail">メールアドレス *</Label>
              <Input
                id="edit-table-user-mail"
                type="email"
                value={editTableUserForm.mail}
                onChange={(e) => setEditTableUserForm(prev => ({ ...prev, mail: e.target.value }))}
                placeholder="メールアドレスを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-table-user-password">パスワード</Label>
              <Input
                id="edit-table-user-password"
                type="password"
                value={editTableUserForm.password}
                onChange={(e) => setEditTableUserForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="新しいパスワード（変更する場合のみ）"
              />
              <p className="text-xs text-gray-500">空の場合は現在のパスワードを維持します</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-table-user-gender">性別</Label>
              <Select
                value={editTableUserForm.gender}
                onValueChange={(value) => setEditTableUserForm(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger id="edit-table-user-gender">
                  <SelectValue placeholder="性別を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-table-user-other">備考</Label>
              <Input
                id="edit-table-user-other"
                value={editTableUserForm.other}
                onChange={(e) => setEditTableUserForm(prev => ({ ...prev, other: e.target.value }))}
                placeholder="備考を入力（任意）"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditTableUserDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSaveEditTableUser} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '更新中...' : '更新'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* テーブル管理ユーザー削除確認ダイアログ */}
      <AlertDialog open={isDeleteTableUserDialogOpen} onOpenChange={setIsDeleteTableUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テーブル管理ユーザー削除</AlertDialogTitle>
            <AlertDialogDescription>
              このテーブル管理ユーザーを削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTableUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
