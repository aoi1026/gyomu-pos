'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Edit, Save, Users, X } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface Cast {
  id: string;
  name: string;
  email: string;
  main_nomination: number;
  inside_nomination: number;
  together_nomination: number;
  hourly_price?: number;
  created_at: string;
}

interface EditBackRateForm {
  cast_id: string;
  cast_name: string;
  main_nomination: number;
  inside_nomination: number;
  together_nomination: number;
  hourly_price: number;
}

export default function NominationBackRatesPanel() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditBackRateForm>({
    cast_id: '',
    cast_name: '',
    main_nomination: 0,
    inside_nomination: 0,
    together_nomination: 0,
    hourly_price: 0,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [bulkMain, setBulkMain] = useState('');
  const [bulkInside, setBulkInside] = useState('');
  const [bulkTogether, setBulkTogether] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const { success, error } = useNotificationContext();

  useEffect(() => {
    void loadCasts();
  }, []);

  const loadCasts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cast-back-rates');
      const result = await response.json();

      if (result.success) {
        const normalizedCasts: Cast[] = result.casts.map((cast: any) => ({
          id: String(cast.id),
          name: cast.name,
          email: cast.email,
          main_nomination: Number(cast.main_nomination ?? 0),
          inside_nomination: Number(cast.inside_nomination ?? 0),
          together_nomination: Number(cast.together_nomination ?? 0),
          hourly_price: cast.hourly_price !== undefined && cast.hourly_price !== null ? Number(cast.hourly_price) : undefined,
          created_at: cast.created_at,
        }));
        setCasts(normalizedCasts);
      } else {
        error('エラー', 'キャストの読み込みに失敗しました');
      }
    } catch {
      error('エラー', 'キャストの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (form: EditBackRateForm): string[] => {
    const errors: string[] = [];
    if (!Number.isFinite(form.hourly_price) || form.hourly_price < 0) errors.push('時給は0以上の数値を入力してください');
    if (form.main_nomination < 0 || form.main_nomination > 100) errors.push('本指名料率は0-100%の範囲で入力してください');
    if (form.inside_nomination < 0 || form.inside_nomination > 100) errors.push('場内指名料率は0-100%の範囲で入力してください');
    if (form.together_nomination < 0 || form.together_nomination > 100) errors.push('同伴料率は0-100%の範囲で入力してください');
    return errors;
  };

  const formatBackRate = (rate: number | null | undefined): string => {
    const value = Number.isFinite(rate) ? Number(rate) : 0;
    return `${value.toFixed(2)}%`;
  };

  const formatHourlyPrice = (v: number | null | undefined): string => {
    const n = Number.isFinite(v) ? Number(v) : 0;
    return `${Math.round(n).toLocaleString('ja-JP')}円`;
  };

  const handleEdit = (cast: Cast) => {
    setEditForm({
      cast_id: cast.id,
      cast_name: cast.name,
      main_nomination: Number(cast.main_nomination ?? 0),
      inside_nomination: Number(cast.inside_nomination ?? 0),
      together_nomination: Number(cast.together_nomination ?? 0),
      hourly_price: Number(cast.hourly_price ?? 0),
    });
    setValidationErrors([]);
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    const errors = validate(editForm);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const response = await fetch('/api/cast-back-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId: editForm.cast_id,
          mainNomination: editForm.main_nomination,
          insideNomination: editForm.inside_nomination,
          togetherNomination: editForm.together_nomination,
          hourlyPrice: editForm.hourly_price,
        }),
      });
      const result = await response.json();
      if (result.success) {
        success('更新完了', `${editForm.cast_name}の指名バック率を更新しました`);
        setIsEditDialogOpen(false);
        await loadCasts();
      } else {
        error('エラー', result.error || 'バック率の更新に失敗しました');
      }
    } catch {
      error('エラー', 'バック率の更新に失敗しました');
    }
  };

  const handleBulkApply = async () => {
    const payload: Record<string, unknown> = { applyToAllCasts: true };
    const errs: string[] = [];
    const mainTrim = bulkMain.trim();
    const insideTrim = bulkInside.trim();
    const togetherTrim = bulkTogether.trim();
    if (!mainTrim && !insideTrim && !togetherTrim) {
      error('エラー', '本指名・場内指名・同伴のいずれかを入力してください');
      return;
    }
    if (mainTrim) {
      const n = parseFloat(mainTrim);
      if (!Number.isFinite(n) || n < 0 || n > 100) errs.push('本指名料率は0〜100です');
      else payload.mainNomination = n;
    }
    if (insideTrim) {
      const n = parseFloat(insideTrim);
      if (!Number.isFinite(n) || n < 0 || n > 100) errs.push('場内指名料率は0〜100です');
      else payload.insideNomination = n;
    }
    if (togetherTrim) {
      const n = parseFloat(togetherTrim);
      if (!Number.isFinite(n) || n < 0 || n > 100) errs.push('同伴料率は0〜100です');
      else payload.togetherNomination = n;
    }
    if (errs.length) {
      error('エラー', errs[0]);
      return;
    }

    setIsBulkSaving(true);
    try {
      const response = await fetch('/api/cast-back-rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        success('一括反映完了', result.message || '全キャストの指名バック率を更新しました');
        setBulkMain('');
        setBulkInside('');
        setBulkTogether('');
        await loadCasts();
      } else {
        error('エラー', result.error || '一括反映に失敗しました');
      }
    } catch {
      error('エラー', '一括反映に失敗しました');
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            現在のバック率設定
          </CardTitle>
          <CardDescription>各キャストの現在有効な「指名バック率」を表示しています</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-purple-900">全キャストに一括反映</h3>
            <p className="text-xs text-gray-600">
              入力した項目だけが上書きされます（空欄の項目は変更しません）
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bulk-main">本指名料 (%)</Label>
                <Input id="bulk-main" type="number" min={0} max={100} step={0.01} placeholder="未変更" value={bulkMain} onChange={(e) => setBulkMain(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bulk-inside">場内指名料 (%)</Label>
                <Input id="bulk-inside" type="number" min={0} max={100} step={0.01} placeholder="未変更" value={bulkInside} onChange={(e) => setBulkInside(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bulk-together">同伴料 (%)</Label>
                <Input id="bulk-together" type="number" min={0} max={100} step={0.01} placeholder="未変更" value={bulkTogether} onChange={(e) => setBulkTogether(e.target.value)} />
              </div>
            </div>
            <Button type="button" onClick={() => void handleBulkApply()} disabled={isBulkSaving} className="bg-purple-700 hover:bg-purple-800">
              <Save className="w-4 h-4 mr-2" />
              {isBulkSaving ? '保存中...' : '全キャストへ適用'}
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>キャスト名</TableHead>
                    {/* <TableHead className="text-center">時給</TableHead> */}
                    <TableHead className="text-center">本指名料</TableHead>
                    <TableHead className="text-center">場内指名料</TableHead>
                    <TableHead className="text-center">同伴料</TableHead>
                    <TableHead className="text-center">登録日</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {casts.map((cast) => (
                    <TableRow key={cast.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-pink-600" />
                          </div>
                          <div>
                            <div className="font-medium">{cast.name}</div>
                            {/* <div className="text-sm text-gray-500">{cast.email}</div> */}
                          </div>
                        </div>
                      </TableCell>
                      {/* <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                          {formatHourlyPrice(cast.hourly_price)}
                        </Badge>
                      </TableCell> */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          {formatBackRate(cast.main_nomination)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          {formatBackRate(cast.inside_nomination)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">
                          {formatBackRate(cast.together_nomination)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500">
                        {new Date(cast.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(cast)}>
                          <Edit className="w-4 h-4 mr-1" />
                          編集
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              指名バック率編集 - {editForm.cast_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">入力エラー</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors.map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nb-hourly">時給（円）</Label>
                  <Input
                    id="nb-hourly"
                    type="number"
                    step="1"
                    min="0"
                    value={editForm.hourly_price}
                    onChange={(e) => setEditForm((p) => ({ ...p, hourly_price: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nb-main">本指名料率 (%)</Label>
                  <Input
                    id="nb-main"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editForm.main_nomination}
                    onChange={(e) => setEditForm((p) => ({ ...p, main_nomination: parseFloat(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nb-inside">場内指名料率 (%)</Label>
                  <Input
                    id="nb-inside"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editForm.inside_nomination}
                    onChange={(e) => setEditForm((p) => ({ ...p, inside_nomination: parseFloat(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nb-together">同伴料率 (%)</Label>
                  <Input
                    id="nb-together"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editForm.together_nomination}
                    onChange={(e) => setEditForm((p) => ({ ...p, together_nomination: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

