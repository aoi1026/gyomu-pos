'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, ArrowLeft, Save, RefreshCw, Plus, ChevronDown, ChevronUp, Package, Percent, CheckCircle } from 'lucide-react';
import { getCurrentUser, hasRole } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SalarySettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [standardDate, setStandardDate] = useState<number>(1);
  const [regularWage, setRegularWage] = useState<number>(0);
  const [arubaitoWage, setArubaitoWage] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 製品設定関連
  const [showProductSettings, setShowProductSettings] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [attendayData, setAttendayData] = useState<Array<{ category_id: number; category_name: string; [key: number]: number | string }>>([]);
  const [isLoadingAttenday, setIsLoadingAttenday] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dayAmounts, setDayAmounts] = useState<{ [key: number]: number }>({});
  const [isSavingAttenday, setIsSavingAttenday] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  
  // キャストバック率関係
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [backRateCategories, setBackRateCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [backRateData, setBackRateData] = useState<{ [castId: number]: { [categoryId: number]: number } }>({});
  const [showBackRateAddModal, setShowBackRateAddModal] = useState(false);
  const [selectedBackRateCategory, setSelectedBackRateCategory] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ castId: number; categoryId: number } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isSavingBackRate, setIsSavingBackRate] = useState(false);
  
  // 100%給与反映
  const [fullReflectCategories, setFullReflectCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [showFullReflectAddModal, setShowFullReflectAddModal] = useState(false);
  const [selectedFullReflectCategory, setSelectedFullReflectCategory] = useState<number | null>(null);
  const [isSavingFullReflect, setIsSavingFullReflect] = useState(false);
  
  // アクティブなタブ
  const [activeTab, setActiveTab] = useState<string>('attenday');

  useEffect(() => {
    // 管理者認証情報を優先
    const adminAuth = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') : null;
    if (adminAuth) {
      try {
        const parsedAdminAuth = JSON.parse(adminAuth);
        setUser(parsedAdminAuth);
        loadSettings();
        loadCategories();
        loadAllUsers();
        loadBackRateData();
        loadFullReflectData();
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('管理者認証情報の解析に失敗しました:', error);
        localStorage.removeItem('admin_auth');
      }
    }

    // 従来の認証システムも確認
    const currentUser = getCurrentUser();
    if (!currentUser || !hasRole(currentUser, 'admin')) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    loadSettings();
    loadCategories();
    loadAllUsers();
    loadBackRateData();
    loadFullReflectData();
    setIsLoading(false);
  }, [router]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/salary-settings');
      const result = await response.json();
      if (result.success && result.data) {
        setStandardDate(result.data.standard_date || 1);
        setRegularWage(result.data.regular || 0);
        setArubaitoWage(result.data.arubaito || 0);
      }
    } catch (error) {
      console.error('設定取得エラー:', error);
      setMessage({ type: 'error', text: '設定の取得に失敗しました' });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/salary-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard_date: standardDate,
          regular: regularWage,
          arubaito: arubaitoWage
        })
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: '時給設定を保存しました' });
      } else {
        setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateHourlyPrices = async () => {
    setIsUpdating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/salary-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: result.message || '時給を更新しました' });
      } else {
        setMessage({ type: 'error', text: result.error || '更新に失敗しました' });
      }
    } catch (error) {
      console.error('更新エラー:', error);
      setMessage({ type: 'error', text: '更新に失敗しました' });
    } finally {
      setIsUpdating(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('カテゴリー取得エラー:', error);
    }
  };

  const loadAttendayData = async () => {
    setIsLoadingAttenday(true);
    try {
      const response = await fetch('/api/salary-attenday');
      const result = await response.json();
      if (result.success) {
        // カテゴリーごとにデータを整理
        const categoryMap: { [key: number]: { category_id: number; category_name: string; [key: number]: number } } = {};
        result.data.forEach((item: any) => {
          const catId = item.category_id;
          if (!categoryMap[catId]) {
            categoryMap[catId] = {
              category_id: catId,
              category_name: item.category_name,
            };
          }
          categoryMap[catId][item.attenday_number] = parseFloat(item.value) || 0;
        });
        setAttendayData(Object.values(categoryMap));
      }
    } catch (error) {
      console.error('出勤日数別金額取得エラー:', error);
      setMessage({ type: 'error', text: 'データの取得に失敗しました' });
    } finally {
      setIsLoadingAttenday(false);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedCategory(null);
    setDayAmounts({});
    setShowAddModal(true);
  };

  const handleSaveAttenday = async () => {
    if (!selectedCategory) {
      setMessage({ type: 'error', text: 'カテゴリーを選択してください' });
      return;
    }

    setIsSavingAttenday(true);
    setMessage(null);
    try {
      // 1～7日の各日について保存
      const promises = [];
      for (let day = 1; day <= 7; day++) {
        const value = dayAmounts[day] || 0;
        promises.push(
          fetch('/api/salary-attenday', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category_id: selectedCategory,
              attenday_number: day,
              value: value
            })
          })
        );
      }

      await Promise.all(promises);
      setShowAddModal(false);
      setMessage({ type: 'success', text: '日別金額を保存しました' });
      loadAttendayData();
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSavingAttenday(false);
    }
  };

  const handleUpdateCategoryFromAttendance = async () => {
    setIsUpdatingCategory(true);
    setMessage(null);
    try {
      const response = await fetch('/api/salary-category/update-from-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: result.message || '給与カテゴリを更新しました' });
      } else {
        setMessage({ type: 'error', text: result.error || '更新に失敗しました' });
      }
    } catch (error) {
      console.error('更新エラー:', error);
      setMessage({ type: 'error', text: '更新に失敗しました' });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      if (result.success) {
        setAllUsers(result.data);
      }
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
    }
  };

  const loadBackRateData = async () => {
    try {
      const response = await fetch('/api/salary-category?type=back_rate');
      const result = await response.json();
      if (result.success) {
        // カテゴリー一覧を取得
        const categorySet = new Set<number>();
        const dataMap: { [castId: number]: { [categoryId: number]: number } } = {};
        
        result.data.forEach((item: any) => {
          categorySet.add(item.category_id);
          if (!dataMap[item.cast_id]) {
            dataMap[item.cast_id] = {};
          }
          dataMap[item.cast_id][item.category_id] = parseFloat(item.value) || 0;
        });
        
        // カテゴリー名を取得
        const categoryIds = Array.from(categorySet);
        if (categoryIds.length > 0) {
          const catResponse = await fetch('/api/categories');
          const catResult = await catResponse.json();
          if (catResult.success) {
            const cats = catResult.categories.filter((cat: any) => categoryIds.includes(cat.id));
            setBackRateCategories(cats);
          }
        }
        
        setBackRateData(dataMap);
      }
    } catch (error) {
      console.error('バック率データ取得エラー:', error);
    }
  };

  const loadFullReflectData = async () => {
    try {
      const response = await fetch('/api/salary-category?type=full_reflect');
      const result = await response.json();
      if (result.success) {
        // カテゴリー一覧を取得
        const categorySet = new Set<number>();
        result.data.forEach((item: any) => {
          categorySet.add(item.category_id);
        });
        
        // カテゴリー名を取得
        const categoryIds = Array.from(categorySet);
        if (categoryIds.length > 0) {
          const catResponse = await fetch('/api/categories');
          const catResult = await catResponse.json();
          if (catResult.success) {
            const cats = catResult.categories.filter((cat: any) => categoryIds.includes(cat.id));
            setFullReflectCategories(cats);
          }
        }
      }
    } catch (error) {
      console.error('100%給与反映データ取得エラー:', error);
    }
  };

  // 使用済みカテゴリーを取得（重複チェック用）
  const getUsedCategories = (): number[] => {
    const used: number[] = [];
    attendayData.forEach(item => used.push(item.category_id));
    backRateCategories.forEach(cat => used.push(cat.id));
    fullReflectCategories.forEach(cat => used.push(cat.id));
    return used;
  };

  const handleAddBackRateCategory = async () => {
    if (!selectedBackRateCategory) {
      setMessage({ type: 'error', text: 'カテゴリーを選択してください' });
      return;
    }

    setIsSavingBackRate(true);
    setMessage(null);
    try {
      // 全ユーザーに対してvalue=0で保存
      const response = await fetch('/api/salary-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedBackRateCategory,
          value: 0
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowBackRateAddModal(false);
        setSelectedBackRateCategory(null);
        setMessage({ type: 'success', text: 'カテゴリーを追加しました' });
        loadBackRateData();
      } else {
        setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSavingBackRate(false);
    }
  };

  const handleCellEdit = (castId: number, categoryId: number, currentValue: number) => {
    setEditingCell({ castId, categoryId });
    setEditingValue(currentValue.toString());
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    
    const value = parseFloat(editingValue);
    if (isNaN(value) || value < 0 || value >= 1) {
      setMessage({ type: 'error', text: '0以上1未満の数値を入力してください' });
      return;
    }

    setIsSavingBackRate(true);
    setMessage(null);
    try {
      const response = await fetch('/api/salary-category', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cast_id: editingCell.castId,
          category_id: editingCell.categoryId,
          value: value
        })
      });

      const result = await response.json();
      if (result.success) {
        setEditingCell(null);
        setEditingValue('');
        setMessage({ type: 'success', text: '保存しました' });
        loadBackRateData();
      } else {
        setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSavingBackRate(false);
    }
  };

  const handleAddFullReflectCategory = async () => {
    if (!selectedFullReflectCategory) {
      setMessage({ type: 'error', text: 'カテゴリーを選択してください' });
      return;
    }

    setIsSavingFullReflect(true);
    setMessage(null);
    try {
      // 全ユーザーに対してvalue=-1で保存
      const response = await fetch('/api/salary-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedFullReflectCategory,
          value: -1
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowFullReflectAddModal(false);
        setSelectedFullReflectCategory(null);
        setMessage({ type: 'success', text: 'カテゴリーを追加しました' });
        loadFullReflectData();
      } else {
        setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSavingFullReflect(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <DollarSign className="w-8 h-8 mr-3 text-emerald-600" />
          給与項目管理
        </h1>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* キャスト時給設定 */}
        <Card>
          <CardHeader>
            <CardTitle>キャスト時給設定</CardTitle>
            <CardDescription>
              基準日数に基づいてレギュラーとアルバイトの時給を設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="standard-date">基準日選択</Label>
              <Select
                value={standardDate.toString()}
                onValueChange={(value) => setStandardDate(parseInt(value))}
              >
                <SelectTrigger id="standard-date" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                前週の出勤日数が{standardDate}日以上（{standardDate}日含む）の場合、レギュラー時給が適用されます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regular-wage">
                {standardDate}日以上（{standardDate}日含む）: 時給入力欄 (レギュラー)
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="regular-wage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={regularWage}
                  onChange={(e) => setRegularWage(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                />
                <span className="text-gray-600">円</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arubaito-wage">
                {standardDate}日未満: 時給入力欄 (アルバイト)
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="arubaito-wage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={arubaitoWage}
                  onChange={(e) => setArubaitoWage(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                />
                <span className="text-gray-600">円</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
              <Button
                onClick={handleUpdateHourlyPrices}
                disabled={isUpdating}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? '更新中...' : '前週の出勤日数に基づいて時給を更新'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 製品設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>製品設定</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowProductSettings(!showProductSettings);
                  if (!showProductSettings) {
                    loadAttendayData();
                    loadBackRateData();
                    loadFullReflectData();
                  }
                }}
              >
                {showProductSettings ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              出勤日数に関係なく、キャストバック率に関係なく、100%給与反映で分ける
            </CardDescription>
          </CardHeader>
          {showProductSettings && (
            <CardContent>
              <div className="flex gap-6">
                {/* 左サイドバー */}
                <div className="w-64 flex-shrink-0 border-r pr-6">
                  <h3 className="text-lg font-semibold mb-4">設定分類</h3>
                  <div className="space-y-2">
                    <Button
                      variant={activeTab === 'attenday' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setActiveTab('attenday')}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      出勤日数に関係なく
                    </Button>
                    <Button
                      variant={activeTab === 'back_rate' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setActiveTab('back_rate')}
                    >
                      <Percent className="w-4 h-4 mr-2" />
                      キャストバック率関係
                    </Button>
                    <Button
                      variant={activeTab === 'full_reflect' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setActiveTab('full_reflect')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      100%給与反映
                    </Button>
                  </div>
                </div>

                {/* 右側設定画面 */}
                <div className="flex-1">
                  {activeTab === 'attenday' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">出勤日数に関係なく</h3>
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleOpenAddModal}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            データ追加
                          </Button>
                          <Button
                            onClick={handleUpdateCategoryFromAttendance}
                            disabled={isUpdatingCategory}
                            size="sm"
                            variant="outline"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isUpdatingCategory ? 'animate-spin' : ''}`} />
                            {isUpdatingCategory ? '更新中...' : '前週の出勤日数に基づいて給与カテゴリを更新'}
                          </Button>
                        </div>
                      </div>

                      {isLoadingAttenday ? (
                        <div className="text-center py-8 text-gray-500">読み込み中...</div>
                      ) : attendayData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">データがありません</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[150px]">カテゴリー名</TableHead>
                                <TableHead className="text-center">1日</TableHead>
                                <TableHead className="text-center">2日</TableHead>
                                <TableHead className="text-center">3日</TableHead>
                                <TableHead className="text-center">4日</TableHead>
                                <TableHead className="text-center">5日</TableHead>
                                <TableHead className="text-center">6日</TableHead>
                                <TableHead className="text-center">7日</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {attendayData.map((item) => (
                                <TableRow key={item.category_id}>
                                  <TableCell className="font-semibold">{item.category_name}</TableCell>
                                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                    <TableCell key={day} className="text-center">
                                      {item[day] ? `¥${item[day].toLocaleString()}` : '-'}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'back_rate' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">キャストバック率関係</h3>
                        <Button
                          onClick={() => setShowBackRateAddModal(true)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          データ追加
                        </Button>
                      </div>

                      {backRateCategories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">データがありません</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[150px]">キャスト名</TableHead>
                                {backRateCategories.map((cat) => (
                                  <TableHead key={cat.id} className="text-center min-w-[120px]">
                                    {cat.name}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allUsers.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className="font-semibold">{user.name}</TableCell>
                                  {backRateCategories.map((cat) => {
                                    const value = backRateData[user.id]?.[cat.id] || 0;
                                    const isEditing = editingCell?.castId === user.id && editingCell?.categoryId === cat.id;
                                    return (
                                      <TableCell key={cat.id} className="text-center">
                                        {isEditing ? (
                                          <div className="flex items-center space-x-2">
                                            <Input
                                              type="number"
                                              min="0"
                                              max="0.999"
                                              step="0.001"
                                              value={editingValue}
                                              onChange={(e) => setEditingValue(e.target.value)}
                                              className="w-20"
                                              autoFocus
                                            />
                                            <Button
                                              size="sm"
                                              onClick={handleCellSave}
                                              disabled={isSavingBackRate}
                                            >
                                              保存
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setEditingCell(null)}
                                            >
                                              キャンセル
                                            </Button>
                                          </div>
                                        ) : (
                                          <div
                                            className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                                            onClick={() => handleCellEdit(user.id, cat.id, value)}
                                          >
                                            {value > 0 ? (value * 100).toFixed(1) + '%' : '-'}
                                          </div>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'full_reflect' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">100%給与反映</h3>
                        <Button
                          onClick={() => setShowFullReflectAddModal(true)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          データ追加
                        </Button>
                      </div>

                      {fullReflectCategories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">データがありません</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[80px]">番号</TableHead>
                                <TableHead className="min-w-[200px]">カテゴリー名</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fullReflectCategories.map((cat, index) => (
                                <TableRow key={cat.id}>
                                  <TableCell className="text-center font-semibold">{index + 1}</TableCell>
                                  <TableCell>{cat.name}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* 出勤日数に関係なく - データ追加モーダル */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>日別金額設定</DialogTitle>
            <DialogDescription>
              製品カテゴリーを選択し、1～7日までの日別金額を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-select">製品カテゴリー</Label>
              <Select
                value={selectedCategory?.toString() || ''}
                onValueChange={(value) => setSelectedCategory(parseInt(value))}
              >
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="カテゴリーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => !getUsedCategories().includes(cat.id))
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>日別金額（1～7日）</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className="space-y-2">
                    <Label htmlFor={`day-${day}`} className="text-sm">
                      {day}日
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`day-${day}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={dayAmounts[day] || ''}
                        onChange={(e) => setDayAmounts({ ...dayAmounts, [day]: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-600">円</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={isSavingAttenday}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSaveAttenday}
                disabled={isSavingAttenday || !selectedCategory}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingAttenday ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* キャストバック率関係 - データ追加モーダル */}
      <Dialog open={showBackRateAddModal} onOpenChange={setShowBackRateAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリー追加</DialogTitle>
            <DialogDescription>
              キャストバック率関係に追加するカテゴリーを選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="back-rate-category-select">カテゴリー</Label>
              <Select
                value={selectedBackRateCategory?.toString() || ''}
                onValueChange={(value) => setSelectedBackRateCategory(parseInt(value))}
              >
                <SelectTrigger id="back-rate-category-select">
                  <SelectValue placeholder="カテゴリーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => !getUsedCategories().includes(cat.id))
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowBackRateAddModal(false)}
                disabled={isSavingBackRate}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleAddBackRateCategory}
                disabled={isSavingBackRate || !selectedBackRateCategory}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingBackRate ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 100%給与反映 - データ追加モーダル */}
      <Dialog open={showFullReflectAddModal} onOpenChange={setShowFullReflectAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリー追加</DialogTitle>
            <DialogDescription>
              100%給与反映に追加するカテゴリーを選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-reflect-category-select">カテゴリー</Label>
              <Select
                value={selectedFullReflectCategory?.toString() || ''}
                onValueChange={(value) => setSelectedFullReflectCategory(parseInt(value))}
              >
                <SelectTrigger id="full-reflect-category-select">
                  <SelectValue placeholder="カテゴリーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => !getUsedCategories().includes(cat.id))
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowFullReflectAddModal(false)}
                disabled={isSavingFullReflect}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleAddFullReflectCategory}
                disabled={isSavingFullReflect || !selectedFullReflectCategory}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingFullReflect ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

