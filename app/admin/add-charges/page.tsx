'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, ArrowLeft, Edit2, Loader2, RefreshCcw, Save, Settings2 } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

type ChargeName =
  | 'main'
  | 'inside'
  | 'together'
  | 'bottle_keep'
  | 'song_room'
  | 'set_price'
  | 'extension_price';

interface AddCharge {
  id: number;
  charge_name: ChargeName;
  value: number;
  other: string | null;
  created_at: string;
  updated_at: string;
}

const CHARGE_LABELS: Record<ChargeName, { title: string; description: string }> = {
  main: { title: '本指名料', description: '' }, // 来店時に発生する本指名料です。
  inside: { title: '場内指名料', description: '' }, // 店内滞在に対して発生する指名料です。
  together: { title: '同伴料', description: '' }, // キャストとの同伴にかかる料金です。
  bottle_keep: { title: 'ボトル保管料', description: '' }, // ボトルをキープする際に発生する料金です。
  song_room: { title: 'カラオケ利用料', description: '' }, // カラオケ設備の利用に対する料金です。
  set_price: { title: 'セット料金', description: '' }, // 基本セット料金です。
  extension_price: { title: '延長料金', description: '' }, // セット延長時の料金です。
};

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

export default function AddChargesPage() {
  const router = useRouter();
  const { success, error } = useNotificationContext();

  const [charges, setCharges] = useState<AddCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedCharge, setSelectedCharge] = useState<AddCharge | null>(null);
  const [otherMemo, setOtherMemo] = useState<string>('');
  const [valueInput, setValueInput] = useState<string>('');

  const sortedCharges = useMemo(() => {
    return [...charges].sort((a, b) => a.id - b.id);
  }, [charges]);

  useEffect(() => {
    loadCharges();
  }, []);

  const loadCharges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/add-charges');
      const result = await response.json();
      if (result.success) {
        setCharges(
          (result.charges || [])
            // standard_date / regular / arubaito など、追加料金以外の設定レコードは表示から除外
            .filter(
              (charge: any) =>
                !['standard_date', 'regular', 'arubaito', 'vip_room'].includes(
                  String(charge.charge_name)
                )
            )
            .map((charge: any) => ({
              ...charge,
              value: Number(charge.value ?? 0),
              other: charge.other ?? '',
            }))
        );
      } else {
        error('エラー', result.error || '追加料金の取得に失敗しました');
      }
    } catch (err) {
      console.error('追加料金取得エラー:', err);
      error('エラー', '追加料金の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (charge: AddCharge) => {
    setSelectedCharge(charge);
    setValueInput(charge.value.toString());
    setOtherMemo(charge.other ?? '');
  };

  const closeEditDialog = () => {
    setSelectedCharge(null);
    setValueInput('');
    setOtherMemo('');
  };

  const handleSave = async () => {
    if (!selectedCharge) return;
    const numericValue = Number(valueInput);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      error('エラー', '料金は0以上の数値で入力してください');
      return;
    }

    setIsSaving(selectedCharge.charge_name);
    try {
      const response = await fetch('/api/add-charges', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chargeName: selectedCharge.charge_name,
          value: numericValue,
          other: otherMemo,
        }),
      });

      const result = await response.json();
      if (result.success) {
        success('更新完了', `${CHARGE_LABELS[selectedCharge.charge_name].title}を更新しました`);
        await loadCharges();
        closeEditDialog();
      } else {
        error('エラー', result.error || '追加料金の更新に失敗しました');
      }
    } catch (err) {
      console.error('追加料金更新エラー:', err);
      error('エラー', '追加料金の更新に失敗しました');
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                ダッシュボードに戻る
              </Button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">料金設定</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCharges}
              className="flex items-center space-x-2"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>再読み込み</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings2 className="w-5 h-5 mr-2 text-purple-600" />
              料金設定
            </CardTitle>
            <CardDescription>
              店舗で利用する各種追加料金の一覧と設定値です。必要に応じて値やメモを更新してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>項目</TableHead>
                    <TableHead className="text-center w-32">現在の料金</TableHead>
                    {/* <TableHead className="text-center w-32">セット料金</TableHead>
                    <TableHead className="text-center w-32">延長料金</TableHead> */}
                    <TableHead className="text-center w-75">メモ</TableHead>
                    <TableHead className="w-24 text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCharges.map((charge) => {
                    // DBに予期しないcharge_nameが入っている場合に備えてフォールバックを用意
                    const metadata =
                      CHARGE_LABELS[charge.charge_name] ?? {
                        title: charge.charge_name,
                        description: '',
                      };
                    return (
                      <TableRow key={charge.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{metadata.title}</span>
                            <span className="text-xs text-gray-500">{metadata.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-gray-50 text-gray-700">
                            {currencyFormatter.format(charge.value)}
                          </Badge>
                        </TableCell>
                        {/* set_price / extension_price は「行（charge_name）」として管理し、valueを参照する */}
                        <TableCell className="text-center text-sm text-gray-600">
                          {charge.other ? charge.other : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(charge)}
                            className="flex items-center space-x-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>編集</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selectedCharge} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings2 className="w-5 h-5 text-purple-600" />
              <span>
                {selectedCharge
                  ? (CHARGE_LABELS[selectedCharge.charge_name] ?? {
                      title: selectedCharge.charge_name,
                      description: '',
                    }).title
                  : ''}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedCharge && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="charge_value">料金 (円)</Label>
                <Input
                  id="charge_value"
                  type="number"
                  min="0"
                  step="100"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* セット料金/延長料金は add_charges の set_price / extension_price 行の value を編集してください */}
              <div>
                <Label htmlFor="charge_other">メモ</Label>
                <Input
                  id="charge_other"
                  value={otherMemo}
                  onChange={(e) => setOtherMemo(e.target.value)}
                  placeholder="必要に応じてメモを入力してください"
                  className="mt-2"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700 flex space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  料金は税込金額で入力してください。変更内容は保存後すぐに反映されます。
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={closeEditDialog}>
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={isSaving !== null}>
                  {isSaving !== null ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

