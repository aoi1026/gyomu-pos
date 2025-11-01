'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, Tag, Plus, Edit, Trash2, Save, X, 
  AlertCircle, CheckCircle, Package
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface Category {
  id: number;
  name: string;
  other: string;
  created_at: string;
  updated_at: string;
}

interface CategoryForm {
  name: string;
  other: string;
}

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>({
    name: '',
    other: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.categories);
      } else {
        error('エラー', 'カテゴリの読み込みに失敗しました');
      }
    } catch (err) {
      error('エラー', 'カテゴリの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setForm({ name: '', other: '' });
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      other: category.other
    });
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleDelete = (categoryId: number) => {
    setDeleteCategoryId(categoryId);
    setIsDeleteDialogOpen(true);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!form.name.trim()) {
      errors.push('カテゴリ名は必須です');
    }
    
    if (form.name.trim().length > 100) {
      errors.push('カテゴリ名は100文字以内で入力してください');
    }
    
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const result = await response.json();
      
      if (result.success) {
        success('成功', result.message);
        setIsDialogOpen(false);
        loadCategories();
      } else {
        error('エラー', result.error || '保存に失敗しました');
      }
    } catch (err) {
      error('エラー', '保存に失敗しました');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCategoryId) return;

    try {
      const response = await fetch(`/api/categories/${deleteCategoryId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        success('成功', result.message);
        setIsDeleteDialogOpen(false);
        setDeleteCategoryId(null);
        loadCategories();
      } else {
        error('エラー', result.error || '削除に失敗しました');
      }
    } catch (err) {
      error('エラー', '削除に失敗しました');
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setForm({ name: '', other: '' });
    setValidationErrors([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                onClick={() => router.push('/admin/menu')}
                className="self-start sm:self-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">メニュー管理</span>
                <span className="sm:hidden">戻る</span>
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">カテゴリ管理</h1>
                <p className="text-xs sm:text-sm text-gray-500">メニューカテゴリの管理</p>
              </div>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              カテゴリ追加
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 説明カード */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">カテゴリ管理について</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">カテゴリ名</h4>
                    <p>メニューの分類名（例：飲み物、食べ物、デザートなど）</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">備考</h4>
                    <p>カテゴリの詳細説明や注意事項</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* カテゴリ一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              カテゴリ一覧
            </CardTitle>
            <CardDescription>
              登録されているカテゴリの一覧です
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">カテゴリがありません</h3>
                <p className="text-gray-500 mb-4">最初のカテゴリを追加してください</p>
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  カテゴリを追加
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>カテゴリ名</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead>作成日</TableHead>
                      <TableHead>更新日</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Tag className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-gray-500">ID: {category.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {category.other ? (
                              <p className="text-sm text-gray-600 truncate">{category.other}</p>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(category.created_at).toLocaleDateString('ja-JP')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(category.updated_at).toLocaleDateString('ja-JP')}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(category)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              編集
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(category.id)}
                              className="text-red-600 hover:text-red-700"
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

        {/* 追加・編集ダイアログ */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {editingCategory ? (
                  <>
                    <Edit className="w-5 h-5 mr-2" />
                    カテゴリ編集
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    カテゴリ追加
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* バリデーションエラー */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900 mb-1">入力エラー</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* フォーム */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">カテゴリ名 *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例：飲み物、食べ物、デザート"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="other">備考</Label>
                  <Textarea
                    id="other"
                    value={form.other}
                    onChange={(e) => setForm(prev => ({ ...prev, other: e.target.value }))}
                    placeholder="カテゴリの詳細説明や注意事項"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                カテゴリ削除
              </AlertDialogTitle>
              <AlertDialogDescription>
                このカテゴリを削除しますか？この操作は取り消せません。
                関連する商品がある場合は削除できません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
