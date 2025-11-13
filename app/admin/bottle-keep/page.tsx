'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Wine, Pencil, Trash2, Search } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';
import { formatDateTime } from '@/lib/mock-data';

interface BottleKeep {
  id: number;
  client_name: string;
  client_email: string;
  bottle_name: string;
  amount: number;
  session_id: number;
  table_id: number;
  other: string;
  created_at: string;
  updated_at: string;
}

export default function BottleKeepManagementPage() {
  const [bottles, setBottles] = useState<BottleKeep[]>([]);
  const [filteredBottles, setFilteredBottles] = useState<BottleKeep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingBottle, setEditingBottle] = useState<BottleKeep | null>(null);
  const [editFormData, setEditFormData] = useState({
    client_name: '',
    client_email: '',
    bottle_name: '',
    amount: 0,
    other: ''
  });
  const router = useRouter();
  const { success, error, confirm } = useNotificationContext();

  useEffect(() => {
    fetchBottles();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBottles(bottles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = bottles.filter(bottle => 
        bottle.client_name.toLowerCase().includes(query) ||
        bottle.client_email?.toLowerCase().includes(query) ||
        bottle.bottle_name.toLowerCase().includes(query)
      );
      setFilteredBottles(filtered);
    }
  }, [searchQuery, bottles]);

  const fetchBottles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bottle-keep');
      const result = await response.json();
      
      if (result.success) {
        setBottles(result.data || []);
        setFilteredBottles(result.data || []);
      } else {
        error('エラー', 'ボトルデータの取得に失敗しました');
      }
    } catch (err) {
      console.error('ボトルデータ取得エラー:', err);
      error('エラー', 'ボトルデータの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (bottle: BottleKeep) => {
    setEditingBottle(bottle);
    setEditFormData({
      client_name: bottle.client_name,
      client_email: bottle.client_email || '',
      bottle_name: bottle.bottle_name,
      amount: bottle.amount,
      other: bottle.other || ''
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBottle) return;

    try {
      const response = await fetch(`/api/bottle-keep/${editingBottle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      const result = await response.json();

      if (result.success) {
        success('更新完了', 'ボトル情報を更新しました');
        setShowEditDialog(false);
        setEditingBottle(null);
        fetchBottles();
      } else {
        error('エラー', result.error || 'ボトル情報の更新に失敗しました');
      }
    } catch (err) {
      console.error('ボトル更新エラー:', err);
      error('エラー', 'ボトル情報の更新に失敗しました');
    }
  };

  const handleDelete = (bottle: BottleKeep) => {
    confirm(
      '削除確認',
      `${bottle.client_name}様の${bottle.bottle_name}を削除しますか？`,
      async () => {
        try {
          const response = await fetch(`/api/bottle-keep/${bottle.id}`, {
            method: 'DELETE'
          });

          const result = await response.json();

          if (result.success) {
            success('削除完了', 'ボトルを削除しました');
            fetchBottles();
          } else {
            error('エラー', result.error || 'ボトルの削除に失敗しました');
          }
        } catch (err) {
          console.error('ボトル削除エラー:', err);
          error('エラー', 'ボトルの削除に失敗しました');
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ダッシュボード
                </Button>
                <div className="flex items-center space-x-3">
                  <Wine className="w-6 h-6 text-purple-600" />
                  <h1 className="text-xl font-bold text-gray-900">ボトル保管管理</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="顧客名、メール、ボトル名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bottles Table */}
          <Card>
            <CardHeader>
              <CardTitle>ボトル一覧 ({filteredBottles.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>顧客名</TableHead>
                      <TableHead>顧客メール</TableHead>
                      <TableHead>ボトル名</TableHead>
                      <TableHead className="text-center">残量 ml</TableHead>
                      <TableHead>保管日</TableHead>
                      <TableHead>最終更新日</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBottles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                          {searchQuery ? '検索結果がありません' : 'ボトルデータがありません'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBottles.map((bottle) => (
                        <TableRow key={bottle.id}>
                          <TableCell className="font-medium">{bottle.client_name}</TableCell>
                          <TableCell>{bottle.client_email || '-'}</TableCell>
                          <TableCell>{bottle.bottle_name}</TableCell>
                          <TableCell className="text-center">{bottle.amount}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(bottle.created_at)}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(bottle.updated_at)}</TableCell>
                          <TableCell className="max-w-xs truncate">{bottle.other || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(bottle)}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                変更
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(bottle)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                削除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ボトル情報編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client_name">顧客名</Label>
              <Input
                id="client_name"
                value={editFormData.client_name}
                onChange={(e) => setEditFormData({ ...editFormData, client_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="client_email">顧客メール</Label>
              <Input
                id="client_email"
                type="email"
                value={editFormData.client_email}
                onChange={(e) => setEditFormData({ ...editFormData, client_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bottle_name">ボトル名</Label>
              <Input
                id="bottle_name"
                value={editFormData.bottle_name}
                onChange={(e) => setEditFormData({ ...editFormData, bottle_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="amount">残量</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="other">備考</Label>
              <Textarea
                id="other"
                value={editFormData.other}
                onChange={(e) => setEditFormData({ ...editFormData, other: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveEdit}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </RoleGate>
  );
}

