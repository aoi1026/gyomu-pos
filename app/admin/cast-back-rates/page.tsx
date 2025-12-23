'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, DollarSign, Users, Edit, Save, X, 
  TrendingUp, Calendar, AlertCircle, CheckCircle
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface Cast {
  id: string;
  name: string;
  email: string;
  food_back: number;
  drink_back: number;
  main_nomination: number;
  inside_nomination: number;
  together_nomination: number;
  hourly_price?: number;
  created_at: string;
}

interface EditBackRateForm {
  cast_id: string;
  cast_name: string;
  food_back: number;
  drink_back: number;
  main_nomination: number;
  inside_nomination: number;
  together_nomination: number;
  hourly_price: number;
}

export default function CastBackRatesPage() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCast, setEditingCast] = useState<Cast | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditBackRateForm>({
    cast_id: '',
    cast_name: '',
    food_back: 0.05,
    drink_back: 0.10,
    main_nomination: 0.15,
    inside_nomination: 0.08,
    together_nomination: 0.10,
    hourly_price: 0
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    loadCasts();
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
          food_back: Number(cast.food_back ?? 0),
          drink_back: Number(cast.drink_back ?? 0),
          main_nomination: Number(cast.main_nomination ?? 0),
          inside_nomination: Number(cast.inside_nomination ?? 0),
          together_nomination: Number(cast.together_nomination ?? 0),
          hourly_price: cast.hourly_price !== undefined && cast.hourly_price !== null ? Number(cast.hourly_price) : undefined,
          created_at: cast.created_at
        }));
        setCasts(normalizedCasts);
      } else {
        error('エラー', 'キャストの読み込みに失敗しました');
      }
    } catch (err) {
      error('エラー', 'キャストの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (cast: Cast) => {
    setEditingCast(cast);
    setEditForm({
      cast_id: cast.id,
      cast_name: cast.name,
      food_back: Number(cast.food_back ?? 0),
      drink_back: Number(cast.drink_back ?? 0),
      main_nomination: Number(cast.main_nomination ?? 0),
      inside_nomination: Number(cast.inside_nomination ?? 0),
      together_nomination: Number(cast.together_nomination ?? 0),
      hourly_price: Number(cast.hourly_price ?? 0)
    });
    setValidationErrors([]);
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    // バリデーション
    const errors = validateBackRates(editForm);
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
          drinkBack: editForm.food_back,
          bottleBack: editForm.drink_back,
          mainNomination: editForm.main_nomination,
          insideNomination: editForm.inside_nomination,
          togetherNomination: editForm.together_nomination,
          hourlyPrice: editForm.hourly_price
        })
      });

      const result = await response.json();
      
      if (result.success) {
        success('更新完了', `${editForm.cast_name}のバック率を更新しました`);
        setIsEditDialogOpen(false);
        loadCasts();
      } else {
        error('エラー', result.error || 'バック率の更新に失敗しました');
      }
    } catch (err) {
      error('エラー', 'バック率の更新に失敗しました');
    }
  };

  const handleCancel = () => {
    setIsEditDialogOpen(false);
    setEditingCast(null);
    setValidationErrors([]);
  };

  // バック率のバリデーション関数
  const validateBackRates = (form: EditBackRateForm): string[] => {
    const errors: string[] = [];
    
    if (form.main_nomination < 0 || form.main_nomination > 100) {
      errors.push('本指名料率は0-100%の範囲で入力してください');
    }
    if (form.inside_nomination < 0 || form.inside_nomination > 100) {
      errors.push('場内指名料率は0-100%の範囲で入力してください');
    }
    if (form.together_nomination < 0 || form.together_nomination > 100) {
      errors.push('同伴料率は0-100%の範囲で入力してください');
    }
    if (!Number.isFinite(form.hourly_price) || form.hourly_price < 0) {
      errors.push('時給は0以上の数値を入力してください');
    }
    
    return errors;
  };

  // バック率のフォーマット関数（小数点以下2桁）
  const formatBackRate = (rate: number | null | undefined): string => {
    const value = Number.isFinite(rate) ? Number(rate) : 0;
    return `${value.toFixed(2)}%`;
  };

  const formatHourlyPrice = (v: number | null | undefined): string => {
    const n = Number.isFinite(v) ? Number(v) : 0;
    return `${Math.round(n).toLocaleString('ja-JP')}円`;
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
                  onClick={() => router.push('/dashboard')}
                  className="self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ダッシュボード</span>
                  <span className="sm:hidden">戻る</span>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">キャストバック率設定</h1>
                  <p className="text-xs sm:text-sm text-gray-500">キャスト別のバック率を管理します</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 説明カード */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">バック率について</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">フードバック</h4>
                      <p>通常のドリンク注文に対するバック率（通常5%）</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">ドリンクバック</h4>
                      <p>ボトル注文に対するバック率（通常10%）</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">本指名料</h4>
                      <p>お客様からの指名に対する料率（通常15%）</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">場内指名料</h4>
                      <p>店内での指名に対する料率（通常8%）</p>
                    </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">同伴料</h4>
                    <p>同伴時に適用される料率（通常10%）</p>
                  </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* バック率一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                現在のバック率設定
              </CardTitle>
              <CardDescription>
                各キャストの現在有効なバック率を表示しています
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>キャスト名</TableHead>
                      <TableHead className="text-center">時給</TableHead>
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
                              <div className="text-sm text-gray-500">{cast.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                            {formatHourlyPrice(cast.hourly_price)}
                          </Badge>
                        </TableCell>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(cast)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            編集
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 編集ダイアログ */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Edit className="w-5 h-5 mr-2" />
                  バック率編集 - {editForm.cast_name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
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

                {/* バック率設定フォーム */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourly_price">時給（円）</Label>
                      <Input
                        id="hourly_price"
                        type="number"
                        step="1"
                        min="0"
                        value={editForm.hourly_price}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          hourly_price: Number(e.target.value)
                        }))}
                      />
                      <p className="text-xs text-gray-500">給与計算などで参照される時給です</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="main_nomination">本指名料率 (%)</Label>
                      <Input
                        id="main_nomination"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editForm.main_nomination}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          main_nomination: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="inside_nomination">場内指名料率 (%)</Label>
                      <Input
                        id="inside_nomination"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editForm.inside_nomination}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          inside_nomination: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="together_nomination">同伴料率 (%)</Label>
                      <Input
                        id="together_nomination"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editForm.together_nomination}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          together_nomination: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* プレビュー */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">設定プレビュー</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">時給</div>
                      <div className="font-medium">{formatHourlyPrice(editForm.hourly_price)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">本指名料</div>
                      <div className="font-medium">{formatBackRate(editForm.main_nomination)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">場内指名料</div>
                      <div className="font-medium">{formatBackRate(editForm.inside_nomination)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-gray-600">同伴料</div>
                    <div className="font-medium">{formatBackRate(editForm.together_nomination)}</div>
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
        </div>
      </div>
  );
}
