'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DoorOpen, Edit2, Plus, Save } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface RoomRow {
  id: number;
  name: string;
  price?: number | string;
  status: number;
  other: string | null;
  session_id: number | null;
  created_at?: string;
  updated_at?: string;
}

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

export default function AdminRoomsPage() {
  const router = useRouter();
  const { success, error } = useNotificationContext();
  const [isLoading, setIsLoading] = useState(true);
  const [vipRooms, setVipRooms] = useState<RoomRow[]>([]);
  const [songRooms, setSongRooms] = useState<RoomRow[]>([]);
  const [vipAddOpen, setVipAddOpen] = useState(false);
  const [vipEditOpen, setVipEditOpen] = useState(false);
  const [songAddOpen, setSongAddOpen] = useState(false);
  const [selectedVipRoom, setSelectedVipRoom] = useState<RoomRow | null>(null);
  const [vipForm, setVipForm] = useState({ name: '', price: '0', other: '' });
  const [vipEditForm, setVipEditForm] = useState({ name: '', price: '0', other: '' });
  const [songForm, setSongForm] = useState({ name: '', other: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      try {
        const [vipRes, songRes] = await Promise.all([
          fetch('/api/vip-room', { cache: 'no-store' }),
          fetch('/api/song-room', { cache: 'no-store' }),
        ]);
        const vipJson = await vipRes.json();
        const songJson = await songRes.json();
        if (vipJson.success) setVipRooms(vipJson.rooms || []);
        else if (!silent) error('エラー', vipJson.error || 'VIPルームの取得に失敗しました');
        if (songJson.success) setSongRooms(songJson.rooms || []);
        else if (!silent) error('エラー', songJson.error || 'カラオケルームの取得に失敗しました');
      } catch (e) {
        console.error(e);
        if (!silent) error('エラー', '部屋一覧の取得に失敗しました');
      }
    },
    [error]
  );

  useEffect(() => {
    const adminAuth = localStorage.getItem('admin_auth');
    if (!adminAuth) {
      router.push('/admin-login');
      return;
    }
    setIsLoading(false);
    void loadAll();
  }, [router, loadAll]);

  /** 状態はPOS利用で随時変わるため、定期的に再取得して表示を最新に保つ */
  useEffect(() => {
    const pollMs = 5000;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void loadAll({ silent: true });
    };
    const intervalId = window.setInterval(tick, pollMs);
    return () => window.clearInterval(intervalId);
  }, [loadAll]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadAll({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadAll]);

  const saveVip = async () => {
    if (!vipForm.name.trim()) {
      error('エラー', '部屋名を入力してください');
      return;
    }
    const price = Number(vipForm.price);
    if (!Number.isFinite(price) || price < 0) {
      error('エラー', '料金は0以上の数値で入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/vip-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: vipForm.name.trim(), price, other: vipForm.other.trim() || null }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || '追加に失敗しました');
      success('追加完了', 'VIPルームを追加しました');
      setVipAddOpen(false);
      setVipForm({ name: '', price: '0', other: '' });
      await loadAll();
    } catch (e) {
      error('エラー', e instanceof Error ? e.message : '追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const openVipEdit = (room: RoomRow) => {
    setSelectedVipRoom(room);
    setVipEditForm({
      name: room.name,
      price: String(Number(room.price ?? 0)),
      other: room.other ?? '',
    });
    setVipEditOpen(true);
  };

  const saveVipEdit = async () => {
    if (!selectedVipRoom) return;
    if (!vipEditForm.name.trim()) {
      error('エラー', '部屋名を入力してください');
      return;
    }
    const price = Number(vipEditForm.price);
    if (!Number.isFinite(price) || price < 0) {
      error('エラー', '料金は0以上の数値で入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vip-room/${selectedVipRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vipEditForm.name.trim(),
          price,
          other: vipEditForm.other.trim() || null,
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || '更新に失敗しました');
      success('更新完了', 'VIPルームを更新しました');
      setVipEditOpen(false);
      setSelectedVipRoom(null);
      await loadAll();
    } catch (e) {
      error('エラー', e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const saveSong = async () => {
    if (!songForm.name.trim()) {
      error('エラー', '部屋名を入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/song-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: songForm.name.trim(), other: songForm.other.trim() || null }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || '追加に失敗しました');
      success('追加完了', 'カラオケルームを追加しました');
      setSongAddOpen(false);
      setSongForm({ name: '', other: '' });
      await loadAll();
    } catch (e) {
      error('エラー', e instanceof Error ? e.message : '追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTable = (rooms: RoomRow[], type: 'vip' | 'song') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>部屋名</TableHead>
          {type === 'vip' && <TableHead>料金</TableHead>}
          <TableHead>状態</TableHead>
          <TableHead>その他</TableHead>
          {type === 'vip' && <TableHead className="w-24 text-center">操作</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.length === 0 ? (
          <TableRow>
            <TableCell colSpan={type === 'vip' ? 6 : 4} className="text-center text-muted-foreground py-8">
              登録がありません
            </TableCell>
          </TableRow>
        ) : (
          rooms.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              {type === 'vip' && (
                <TableCell>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    {currencyFormatter.format(Number(r.price ?? 0))}
                  </Badge>
                </TableCell>
              )}
              <TableCell>
                {r.status === 1 ? (
                  <Badge variant="destructive">利用中</Badge>
                ) : (
                  <Badge variant="secondary">空き</Badge>
                )}
              </TableCell>
              <TableCell className="max-w-[240px] truncate" title={r.other || ''}>
                {r.other || '—'}
              </TableCell>
              {type === 'vip' && (
                <TableCell className="text-center">
                  <Button size="sm" variant="outline" onClick={() => openVipEdit(r)} className="gap-1">
                    <Edit2 className="w-4 h-4" />
                    編集
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')} aria-label="戻る">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DoorOpen className="w-7 h-7" />
              部屋管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">VIPルームとカラオケルームの登録・状態確認</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ルーム一覧</CardTitle>
            <CardDescription>タブで種別を切り替えてください</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="vip" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="vip">VIPルーム</TabsTrigger>
                <TabsTrigger value="song">カラオケルーム</TabsTrigger>
              </TabsList>
              <TabsContent value="vip" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setVipAddOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    追加
                  </Button>
                </div>
                {renderTable(vipRooms, 'vip')}
              </TabsContent>
              <TabsContent value="song" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setSongAddOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    追加
                  </Button>
                </div>
                {renderTable(songRooms, 'song')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={vipAddOpen} onOpenChange={setVipAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>VIPルームを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vip-name">部屋名</Label>
              <Input
                id="vip-name"
                value={vipForm.name}
                onChange={(e) => setVipForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例: VIP-A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vip-price">料金 (円)</Label>
              <Input
                id="vip-price"
                type="number"
                min="0"
                step="100"
                value={vipForm.price}
                onChange={(e) => setVipForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="例: 5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vip-other">その他</Label>
              <Input
                id="vip-other"
                value={vipForm.other}
                onChange={(e) => setVipForm((p) => ({ ...p, other: e.target.value }))}
                placeholder="備考（任意）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVipAddOpen(false)} disabled={submitting}>
                キャンセル
              </Button>
              <Button onClick={saveVip} disabled={submitting} className="gap-2">
                <Save className="w-4 h-4" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={vipEditOpen} onOpenChange={(open) => {
        setVipEditOpen(open);
        if (!open) setSelectedVipRoom(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>VIPルームを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vip-edit-name">部屋名</Label>
              <Input
                id="vip-edit-name"
                value={vipEditForm.name}
                onChange={(e) => setVipEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例: VIP-A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vip-edit-price">料金 (円)</Label>
              <Input
                id="vip-edit-price"
                type="number"
                min="0"
                step="100"
                value={vipEditForm.price}
                onChange={(e) => setVipEditForm((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vip-edit-other">その他</Label>
              <Input
                id="vip-edit-other"
                value={vipEditForm.other}
                onChange={(e) => setVipEditForm((p) => ({ ...p, other: e.target.value }))}
                placeholder="備考（任意）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVipEditOpen(false)} disabled={submitting}>
                キャンセル
              </Button>
              <Button onClick={saveVipEdit} disabled={submitting} className="gap-2">
                <Save className="w-4 h-4" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={songAddOpen} onOpenChange={setSongAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カラオケルームを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="song-name">部屋名</Label>
              <Input
                id="song-name"
                value={songForm.name}
                onChange={(e) => setSongForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例: カラオケ1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="song-other">その他</Label>
              <Input
                id="song-other"
                value={songForm.other}
                onChange={(e) => setSongForm((p) => ({ ...p, other: e.target.value }))}
                placeholder="備考（任意）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSongAddOpen(false)} disabled={submitting}>
                キャンセル
              </Button>
              <Button onClick={saveSong} disabled={submitting} className="gap-2">
                <Save className="w-4 h-4" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
