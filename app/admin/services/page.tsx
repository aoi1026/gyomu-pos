'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, Edit, Trash2, Settings, Save, X, AlertCircle, ArrowLeft
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';
import { useRouter } from 'next/navigation';

interface Service {
  id: number;
  name: string;
  other: string | null;
  created_at: string;
  updated_at: string;
}

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    other: ''
  });
  
  const { success, error } = useNotificationContext();
  const router = useRouter();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/services');
      const result = await response.json();
      
      if (result.success) {
        setServices(result.services);
      } else {
        error('エラー', result.error || 'サービス一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('サービス取得エラー:', err);
      error('エラー', 'サービス一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!formData.name.trim()) {
      error('エラー', 'サービス名を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          other: formData.other.trim() || null
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('成功', 'サービスが追加されました');
        setShowAddDialog(false);
        setFormData({ name: '', other: '' });
        loadServices();
      } else {
        error('エラー', result.error || 'サービスの追加に失敗しました');
      }
    } catch (err) {
      console.error('サービス追加エラー:', err);
      error('エラー', 'サービスの追加に失敗しました');
    }
  };

  const handleEditService = async () => {
    if (!formData.name.trim() || !selectedService) {
      error('エラー', 'サービス名を入力してください');
      return;
    }

    try {
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          other: formData.other.trim() || null
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('成功', 'サービスが更新されました');
        setShowEditDialog(false);
        setSelectedService(null);
        setFormData({ name: '', other: '' });
        loadServices();
      } else {
        error('エラー', result.error || 'サービスの更新に失敗しました');
      }
    } catch (err) {
      console.error('サービス更新エラー:', err);
      error('エラー', 'サービスの更新に失敗しました');
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;

    try {
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        success('成功', 'サービスが削除されました');
        setShowDeleteDialog(false);
        setSelectedService(null);
        loadServices();
      } else {
        error('エラー', result.error || 'サービスの削除に失敗しました');
      }
    } catch (err) {
      console.error('サービス削除エラー:', err);
      error('エラー', 'サービスの削除に失敗しました');
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      other: service.other || ''
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', other: '' });
    setSelectedService(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ダッシュボードに戻る
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-purple-600" />
            サービス呼び出し項目管理
          </h1>
          <p className="text-gray-600 mt-2">
            テーブルサービス画面で利用できるサービス呼び出し項目を管理します
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">サービス一覧</h2>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              {services.length}件
            </span>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            新しいサービスを追加
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{service.name}</span>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(service)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteDialog(service)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                {service.other && (
                  <CardDescription className="text-sm text-gray-600">
                    {service.other}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-500">
                  <div>作成日: {new Date(service.created_at).toLocaleDateString('ja-JP')}</div>
                  <div>更新日: {new Date(service.updated_at).toLocaleDateString('ja-JP')}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">サービスが登録されていません</h3>
            <p className="text-gray-500 mb-6">最初のサービスを追加してください</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              サービスを追加
            </Button>
          </div>
        )}

        {/* 追加ダイアログ */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2 text-purple-600" />
                新しいサービスを追加
              </DialogTitle>
              <DialogDescription>
                サービス呼び出し項目の情報を入力してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">サービス名 *</Label>
                <Input
                  id="add-name"
                  placeholder="例: おしぼり、灰皿交換、グラス"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-other">詳細情報（任意）</Label>
                <Textarea
                  id="add-other"
                  placeholder="サービスの詳細や注意事項があれば入力してください"
                  value={formData.other}
                  onChange={(e) => setFormData({ ...formData, other: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}>
                キャンセル
              </Button>
              <Button onClick={handleAddService} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                追加
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 編集ダイアログ */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Edit className="w-5 h-5 mr-2 text-blue-600" />
                サービスを編集
              </DialogTitle>
              <DialogDescription>
                サービス情報を編集してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">サービス名 *</Label>
                <Input
                  id="edit-name"
                  placeholder="例: おしぼり、灰皿交換、グラス"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-other">詳細情報（任意）</Label>
                <Textarea
                  id="edit-other"
                  placeholder="サービスの詳細や注意事項があれば入力してください"
                  value={formData.other}
                  onChange={(e) => setFormData({ ...formData, other: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}>
                キャンセル
              </Button>
              <Button onClick={handleEditService} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                更新
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                サービスの削除
              </AlertDialogTitle>
              <AlertDialogDescription>
                「{selectedService?.name}」を削除しますか？この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteDialog(false);
                setSelectedService(null);
              }}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteService}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
