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
  created_at: string;
}

export default function CastsPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    other: ''
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    mail: '',
    password: '',
    other: ''
  });

  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    // 管理者認証情報を確認
    const adminAuth = localStorage.getItem('admin_auth');
    if (adminAuth) {
      try {
        const parsedAdminAuth = JSON.parse(adminAuth);
        setAdminUser(parsedAdminAuth);
        setIsLoading(false);
        fetchCasts();
        return;
      } catch (err) {
        console.error('管理者認証情報の解析に失敗しました:', err);
        localStorage.removeItem('admin_auth');
      }
    }
    
    // 管理者認証情報がない場合はログインページにリダイレクト
    router.push('/login');
  }, [router]);

  const fetchCasts = async () => {
    try {
      const response = await fetch('/api/casts');
      const result = await response.json();
      if (result.success) {
        setCasts(result.data);
      } else {
        error('エラー', 'キャスト一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('キャスト一覧取得エラー:', err);
      error('エラー', 'キャスト一覧の取得に失敗しました');
    }
  };

  const handleAdd = () => {
    setAddForm({ name: '', mail: '', password: '', other: '' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (cast: CastData) => {
    setEditingCast(cast);
    setEditForm({
      name: cast.name,
      mail: cast.mail,
      password: '', // パスワードは空で開始
      other: cast.other || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (castId: number) => {
    setDeleteCastId(castId);
    setIsDeleteDialogOpen(true);
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
        success('追加完了', 'キャストが正常に追加されました');
        setIsAddDialogOpen(false);
        setAddForm({ name: '', mail: '', password: '', other: '' });
        fetchCasts();
      } else {
        error('エラー', result.error || 'キャストの追加に失敗しました');
      }
    } catch (err) {
      console.error('キャスト追加エラー:', err);
      error('エラー', 'キャストの追加に失敗しました');
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
        success('更新完了', 'キャスト情報が正常に更新されました');
        setIsEditDialogOpen(false);
        setEditingCast(null);
        fetchCasts();
      } else {
        error('エラー', result.error || 'キャストの更新に失敗しました');
      }
    } catch (err) {
      console.error('キャスト更新エラー:', err);
      error('エラー', 'キャストの更新に失敗しました');
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
        success('削除完了', 'キャストが正常に削除されました');
        setIsDeleteDialogOpen(false);
        setDeleteCastId(null);
        fetchCasts();
      } else {
        error('エラー', result.error || 'キャストの削除に失敗しました');
      }
    } catch (err) {
      console.error('キャスト削除エラー:', err);
      error('エラー', 'キャストの削除に失敗しました');
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">キャスト管理</h1>
                <p className="text-xs sm:text-sm text-gray-500">キャストの追加・編集・削除</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                キャスト追加
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
              キャスト管理
            </CardTitle>
            <CardDescription>
              キャストの追加、編集、削除を行います。キャストの基本情報と連絡先を管理できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>キャスト追加</span>
              </div>
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-green-600" />
                <span>情報編集</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>キャスト削除</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* キャスト一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                キャスト一覧
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
                <p className="text-gray-500">キャストが登録されていません</p>
                <Button onClick={handleAdd} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  キャストを追加
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>キャスト名</TableHead>
                      <TableHead>メールアドレス</TableHead>
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
                          {cast.other ? (
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{cast.other}</span>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(cast)}
                            >
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
      </div>

      {/* キャスト追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              キャスト追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">キャスト名 *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="キャスト名を入力"
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

      {/* キャスト編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              キャスト編集
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">キャスト名 *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="キャスト名を入力"
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
            <AlertDialogTitle>キャスト削除</AlertDialogTitle>
            <AlertDialogDescription>
              このキャストを削除しますか？この操作は取り消せません。
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
    </div>
  );
}
