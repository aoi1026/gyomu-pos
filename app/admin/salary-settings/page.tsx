'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, ArrowLeft, Save, RefreshCw, Plus, Package, Percent, CheckCircle, Trash2, X, Edit, Pencil, Users } from 'lucide-react';
import { getCurrentUser, hasRole } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import NominationBackRatesPanel from '@/components/admin/NominationBackRatesPanel';

function SalarySettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [standardDate, setStandardDate] = useState<number>(1);
  const [regularWage, setRegularWage] = useState<number>(0);
  const [arubaitoWage, setArubaitoWage] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 製品設定関連
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [attendayData, setAttendayData] = useState<Array<{ category_id: number; category_name: string; [key: number]: number | string }>>([]);
  const [isLoadingAttenday, setIsLoadingAttenday] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dayAmounts, setDayAmounts] = useState<{ [key: number]: number }>({});
  const [editingAttendayCategory, setEditingAttendayCategory] = useState<{ category_id: number; category_name: string } | null>(null);
  const [showDeleteAttendayModal, setShowDeleteAttendayModal] = useState(false);
  const [attendayCategoryToDelete, setAttendayCategoryToDelete] = useState<{ category_id: number; category_name: string } | null>(null);
  const [isDeletingAttenday, setIsDeletingAttenday] = useState(false);
  const [isSavingAttenday, setIsSavingAttenday] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  
  // キャストバック率関係
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [backRateCategories, setBackRateCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [backRateData, setBackRateData] = useState<{ [castId: number]: { [categoryId: number]: number } }>({});
  const [showBackRateAddModal, setShowBackRateAddModal] = useState(false);
  const [selectedBackRateCategory, setSelectedBackRateCategory] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ castId: number; categoryId: number } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isSavingBackRate, setIsSavingBackRate] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  /** 出勤日数に関係なく：日別（1～7）×全カテゴリー一括 */
  const [bulkAttendayByDay, setBulkAttendayByDay] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
    7: '',
  });
  const [isBulkSavingAttenday, setIsBulkSavingAttenday] = useState(false);
  /** 日別モーダル：全曜日へ同額コピー用 */
  const [uniformModalAmount, setUniformModalAmount] = useState('');

  /** キャストバック率：列ごと全キャストへ */
  const [bulkCastBackCategoryId, setBulkCastBackCategoryId] = useState<string>('');
  const [bulkCastBackPercent, setBulkCastBackPercent] = useState('');
  const [isBulkSavingCastBack, setIsBulkSavingCastBack] = useState(false);

  // 100%給与反映
  const [fullReflectCategories, setFullReflectCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [showFullReflectAddModal, setShowFullReflectAddModal] = useState(false);
  const [selectedFullReflectCategory, setSelectedFullReflectCategory] = useState<number | null>(null);
  const [isSavingFullReflect, setIsSavingFullReflect] = useState(false);
  const [showDeleteFullReflectModal, setShowDeleteFullReflectModal] = useState(false);
  const [fullReflectCategoryToDelete, setFullReflectCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingFullReflect, setIsDeletingFullReflect] = useState(false);
  
  // アクティブなメイン項目
  const [activeMainItem, setActiveMainItem] = useState<string>('hourly-wage');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // キャスト給与状態モーダル
  const [showCastStatusModal, setShowCastStatusModal] = useState(false);
  const [castStatusData, setCastStatusData] = useState<any[]>([]);
  const [weekInfo, setWeekInfo] = useState<any>(null);
  const [isLoadingCastStatus, setIsLoadingCastStatus] = useState(false);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'nomination-back-rates') {
      setActiveMainItem('nomination-back-rates');
    }
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
      router.push('/admin-login');
      return;
    }
    setUser(currentUser);
    loadSettings();
    loadCategories();
    loadAllUsers();
    loadBackRateData();
    loadFullReflectData();
    setIsLoading(false);
  }, [router, searchParams]);

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
    setUniformModalAmount('');
    setEditingAttendayCategory(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (category: { category_id: number; category_name: string }) => {
    // 既存の日別金額を取得
    const existingData = attendayData.find(item => item.category_id === category.category_id);
    const amounts: { [key: number]: number } = {};
    if (existingData) {
      for (let day = 1; day <= 7; day++) {
        const value = existingData[day];
        amounts[day] = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0);
      }
    }
    setSelectedCategory(category.category_id);
    setDayAmounts(amounts);
    setUniformModalAmount('');
    setEditingAttendayCategory(category);
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
        const value = typeof dayAmounts[day] === 'number' ? dayAmounts[day] : (parseFloat(String(dayAmounts[day])) || 0);
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
      setSelectedCategory(null);
      setDayAmounts({});
      setEditingAttendayCategory(null);
      setMessage({ type: 'success', text: editingAttendayCategory ? '日別金額を更新しました' : '日別金額を保存しました' });
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

  const handleBulkApplyAttendayAll = async () => {
    if (attendayData.length === 0) {
      setMessage({ type: 'error', text: '適用するカテゴリーがありません' });
      return;
    }

    const dayAmounts: { day: number; amount: number }[] = [];
    for (let day = 1; day <= 7; day++) {
      const raw = (bulkAttendayByDay[day] ?? '').trim();
      if (raw === '') continue;
      const amount = parseFloat(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        setMessage({ type: 'error', text: `${day}日の金額が無効です（0以上の数値を入力してください）` });
        return;
      }
      dayAmounts.push({ day, amount });
    }

    if (dayAmounts.length === 0) {
      setMessage({ type: 'error', text: '反映する日の金額を1つ以上入力してください' });
      return;
    }

    setIsBulkSavingAttenday(true);
    setMessage(null);
    try {
      const tasks: Promise<Response>[] = [];
      for (const { day, amount } of dayAmounts) {
        for (const row of attendayData) {
          tasks.push(
            fetch('/api/salary-attenday', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category_id: row.category_id,
                attenday_number: day,
                value: amount,
              }),
            })
          );
        }
      }
      const responses = await Promise.all(tasks);
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error('一部の保存に失敗しました');
      }

      const cleared: Record<number, string> = { ...bulkAttendayByDay };
      for (const { day } of dayAmounts) {
        cleared[day] = '';
      }
      setBulkAttendayByDay(cleared);

      const dayLabel = dayAmounts.map(({ day, amount }) => `${day}日:¥${amount.toLocaleString()}`).join('、');
      setMessage({
        type: 'success',
        text: `全${attendayData.length}カテゴリーへ反映しました（${dayLabel}）`,
      });
      loadAttendayData();
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: '一括反映に失敗しました' });
    } finally {
      setIsBulkSavingAttenday(false);
    }
  };

  const handleBulkApplyCastBackColumn = async () => {
    const catId = parseInt(bulkCastBackCategoryId, 10);
    if (!Number.isFinite(catId)) {
      setMessage({ type: 'error', text: 'カテゴリーを選択してください' });
      return;
    }
    const pct = parseFloat(bulkCastBackPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
      setMessage({ type: 'error', text: 'バック率は0以上100未満（%）で入力してください' });
      return;
    }
    const value = Math.min(0.999, Math.max(0, pct / 100));

    setIsBulkSavingCastBack(true);
    setMessage(null);
    try {
      const response = await fetch('/api/salary-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: catId,
          value,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: '全キャストへキャストバック率を反映しました' });
        setBulkCastBackPercent('');
        loadBackRateData();
      } else {
        setMessage({ type: 'error', text: result.error || '一括反映に失敗しました' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: '一括反映に失敗しました' });
    } finally {
      setIsBulkSavingCastBack(false);
    }
  };

  const handleDeleteAttendayCategory = async () => {
    if (!attendayCategoryToDelete) return;

    setIsDeletingAttenday(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/salary-attenday?category_id=${attendayCategoryToDelete.category_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        setShowDeleteAttendayModal(false);
        setAttendayCategoryToDelete(null);
        setMessage({ type: 'success', text: 'カテゴリーを削除しました' });
        loadAttendayData();
      } else {
        setMessage({ type: 'error', text: result.error || '削除に失敗しました' });
      }
    } catch (error) {
      console.error('削除エラー:', error);
      setMessage({ type: 'error', text: '削除に失敗しました' });
    } finally {
      setIsDeletingAttenday(false);
    }
  };

  const loadCastStatus = async () => {
    setIsLoadingCastStatus(true);
    try {
      const response = await fetch('/api/salary-settings/cast-status');
      const result = await response.json();
      if (result.success) {
        setCastStatusData(result.data || []);
        setWeekInfo(result.weekInfo || null);
      } else {
        setMessage({ type: 'error', text: result.error || 'データの取得に失敗しました' });
      }
    } catch (error) {
      console.error('キャスト給与状態取得エラー:', error);
      setMessage({ type: 'error', text: 'データの取得に失敗しました' });
    } finally {
      setIsLoadingCastStatus(false);
    }
  };

  const handleOpenCastStatusModal = () => {
    setShowCastStatusModal(true);
    loadCastStatus();
  };

  const handleDeleteFullReflectCategory = async () => {
    if (!fullReflectCategoryToDelete) return;

    setIsDeletingFullReflect(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/salary-full?category_id=${fullReflectCategoryToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        setShowDeleteFullReflectModal(false);
        setFullReflectCategoryToDelete(null);
        setMessage({ type: 'success', text: 'カテゴリーを削除しました' });
        loadFullReflectData();
      } else {
        setMessage({ type: 'error', text: result.error || '削除に失敗しました' });
      }
    } catch (error) {
      console.error('削除エラー:', error);
      setMessage({ type: 'error', text: '削除に失敗しました' });
    } finally {
      setIsDeletingFullReflect(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      if (result.success) {
        setAllUsers(result.data as Array<{ id: number; name: string; role: string }>);
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
      const response = await fetch('/api/salary-full');
      if (!response.ok) {
        console.error('100%給与反映データ取得エラー: HTTP', response.status);
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        const cats = result.data.map((item: any) => ({
          id: item.category_id,
          name: item.category_name
        }));
        setFullReflectCategories(cats);
      } else {
        console.error('100%給与反映データ取得エラー:', result.error);
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
      // salary_fullテーブルに保存（同時に全ユーザーに対してsalary_categoryテーブルにvalue=-1で保存）
      const response = await fetch('/api/salary-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedFullReflectCategory
        })
      });

      const result = await response.json();
      
      // データを再読み込み（エラーが発生した場合でも、データが保存されている可能性があるため）
      await loadFullReflectData();
      
      if (response.ok && result.success) {
        setShowFullReflectAddModal(false);
        setSelectedFullReflectCategory(null);
        setMessage({ type: 'success', text: 'カテゴリーを追加しました' });
      } else {
        // データが保存されているか確認
        const checkResponse = await fetch('/api/salary-full');
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          const exists = checkResult.data?.some((item: any) => item.category_id === selectedFullReflectCategory);
          if (exists) {
            setShowFullReflectAddModal(false);
            setSelectedFullReflectCategory(null);
            setMessage({ type: 'success', text: 'カテゴリーを追加しました（既に保存されていました）' });
          } else {
            setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
          }
        } else {
          setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
        }
      }
    } catch (error: any) {
      console.error('保存エラー:', error);
      // エラーが発生した場合でも、データが保存されている可能性があるため再読み込み
      await loadFullReflectData();
      setMessage({ type: 'error', text: '保存に失敗しました: ' + (error.message || '不明なエラー') });
    } finally {
      setIsSavingFullReflect(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeletingCategory(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/salary-category?category_id=${categoryToDelete.id}&type=back_rate`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        setShowDeleteCategoryModal(false);
        setCategoryToDelete(null);
        setMessage({ type: 'success', text: 'カテゴリーを削除しました' });
        loadBackRateData();
      } else {
        setMessage({ type: 'error', text: result.error || '削除に失敗しました' });
      }
    } catch (error) {
      console.error('削除エラー:', error);
      setMessage({ type: 'error', text: '削除に失敗しました' });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // サイドバーメニューのコンテンツ（再利用可能）
  const SidebarMenuContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="space-y-2">
      <Button
        variant={activeMainItem === 'hourly-wage' ? 'default' : 'ghost'}
        className="w-full justify-start text-sm sm:text-base"
        onClick={() => {
          setActiveMainItem('hourly-wage');
          onItemClick?.();
        }}
      >
        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        <span className="truncate">キャスト時給設定</span>
      </Button>
      <Button
        variant={activeMainItem === 'attenday' ? 'default' : 'ghost'}
        className="w-full justify-start text-sm sm:text-base"
        onClick={() => {
          setActiveMainItem('attenday');
          loadAttendayData();
          onItemClick?.();
        }}
      >
        <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        <span className="truncate">出勤日数に関係なく</span>
      </Button>
      <Button
        variant={activeMainItem === 'back-rate' ? 'default' : 'ghost'}
        className="w-full justify-start text-sm sm:text-base"
        onClick={() => {
          setActiveMainItem('back-rate');
          loadBackRateData();
          onItemClick?.();
        }}
      >
        <Percent className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        <span className="truncate">キャストバック率関係</span>
      </Button>
      <Button
        variant={activeMainItem === 'full-reflect' ? 'default' : 'ghost'}
        className="w-full justify-start text-sm sm:text-base"
        onClick={() => {
          setActiveMainItem('full-reflect');
          loadFullReflectData();
          onItemClick?.();
        }}
      >
        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        <span className="truncate">100%給与反映</span>
      </Button>
      <Button
        variant={activeMainItem === 'nomination-back-rates' ? 'default' : 'ghost'}
        className="w-full justify-start text-sm sm:text-base"
        onClick={() => {
          setActiveMainItem('nomination-back-rates');
          onItemClick?.();
        }}
      >
        <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        <span className="truncate">指名バック率</span>
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm sm:text-base text-gray-500">読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* ヘッダー */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="h-9 sm:h-10 px-2 sm:px-3"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">ダッシュボードに戻る</span>
                <span className="sm:hidden text-xs">戻る</span>
              </Button>
              {/* モバイルメニューボタン */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden h-9 sm:h-10 px-2 sm:px-3" size="sm">
                    <Menu className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">メニュー</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle className="text-base sm:text-lg">設定分類</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <SidebarMenuContent onItemClick={() => setIsMobileMenuOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-2 sm:mr-3 text-emerald-600" />
            <span>給与項目管理</span>
          </h1>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg shadow-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <X className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm sm:text-base">{message.text}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* 左サイドバー（PCのみ表示） */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">設定分類</CardTitle>
              </CardHeader>
              <CardContent>
                <SidebarMenuContent />
              </CardContent>
            </Card>
          </div>

          {/* 右側コンテンツ */}
          <div className="flex-1 min-w-0">
            <div className="space-y-4 sm:space-y-6">
              {/* キャスト時給設定 */}
              {activeMainItem === 'hourly-wage' && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg sm:text-xl md:text-2xl">キャスト時給設定</CardTitle>
                        <CardDescription className="text-sm sm:text-base">
                          基準日数に基づいてレギュラーとアルバイトの時給を設定します
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handleOpenCastStatusModal}
                        size="sm"
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 h-9 sm:h-10 w-full sm:w-auto"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        すべてのキャスト給与状態
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="standard-date" className="text-sm sm:text-base font-medium">基準日選択</Label>
                      <Select
                        value={standardDate.toString()}
                        onValueChange={(value) => setStandardDate(parseInt(value))}
                      >
                        <SelectTrigger id="standard-date" className="w-full h-10 sm:h-11">
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
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        前週の出勤日数が{standardDate}日以上（{standardDate}日含む）の場合、レギュラー時給が適用されます
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regular-wage" className="text-sm sm:text-base font-medium">
                        <span className="hidden sm:inline">{standardDate}日以上（{standardDate}日含む）: </span>時給入力欄 (レギュラー)
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="regular-wage"
                          type="number"
                          min="0"
                          step="0.01"
                          value={regularWage}
                          onChange={(e) => setRegularWage(parseFloat(e.target.value) || 0)}
                          className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                        />
                        <span className="text-sm sm:text-base text-gray-600 font-medium">円</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="arubaito-wage" className="text-sm sm:text-base font-medium">
                        <span className="hidden sm:inline">{standardDate}日未満: </span>時給入力欄 (アルバイト)
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="arubaito-wage"
                          type="number"
                          min="0"
                          step="0.01"
                          value={arubaitoWage}
                          onChange={(e) => setArubaitoWage(parseFloat(e.target.value) || 0)}
                          className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                        />
                        <span className="text-sm sm:text-base text-gray-600 font-medium">円</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 h-10 sm:h-11 w-full sm:w-auto min-w-[120px]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 出勤日数に関係なく */}
              {activeMainItem === 'attenday' && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-lg sm:text-xl md:text-2xl">出勤日数に関係なく</CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-1">
                          カテゴリー別の日別金額を設定します
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handleOpenAddModal}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        データ追加
                      </Button>
                    </div>
                    <div className="mt-4 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 sm:p-4 space-y-3">
                      <p className="text-sm font-medium text-gray-800">一括反映（出勤日1～7ごとに、追加済みの全カテゴリーへ適用）</p>
                      <p className="text-xs text-gray-600">
                        金額を入れた日だけが更新されます（空欄の日は変更しません）。「一括適用」でまとめて保存します。
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
                        {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
                          <div key={day} className="space-y-1">
                            <Label htmlFor={`bulk-attenday-day-${day}`} className="text-xs whitespace-nowrap">
                              {day}日（円）
                            </Label>
                            <Input
                              id={`bulk-attenday-day-${day}`}
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="—"
                              value={bulkAttendayByDay[day] ?? ''}
                              onChange={(e) =>
                                setBulkAttendayByDay((prev) => ({ ...prev, [day]: e.target.value }))
                              }
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 sm:h-10 w-full sm:w-auto shrink-0"
                        disabled={isBulkSavingAttenday || attendayData.length === 0}
                        onClick={() => void handleBulkApplyAttendayAll()}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isBulkSavingAttenday ? 'animate-spin' : ''}`} />
                        {isBulkSavingAttenday ? '反映中...' : '一括適用'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAttenday ? (
                      <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <div className="text-sm sm:text-base text-gray-500">読み込み中...</div>
                      </div>
                    ) : attendayData.length === 0 ? (
                      <div className="text-center py-12 sm:py-16 text-sm sm:text-base text-gray-500">
                        データがありません
                      </div>
                    ) : (
                      <>
                        {/* デスクトップ表示（テーブル） */}
                        <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                          <div className="inline-block min-w-full align-middle">
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
                                  <TableHead className="text-center min-w-[100px]">操作</TableHead>
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
                                    <TableCell className="text-center">
                                      <div className="flex items-center justify-center space-x-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                          onClick={() => handleOpenEditModal({ category_id: item.category_id, category_name: item.category_name })}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            setAttendayCategoryToDelete({ category_id: item.category_id, category_name: item.category_name });
                                            setShowDeleteAttendayModal(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                        {/* モバイル表示（カード） */}
                        <div className="md:hidden space-y-4">
                          {attendayData.map((item) => (
                            <Card key={item.category_id} className="border border-gray-200">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">{item.category_name}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                    <div key={day} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                      <span className="text-sm font-medium text-gray-600">{day}日</span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        {item[day] ? `¥${item[day].toLocaleString()}` : '-'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleOpenEditModal({ category_id: item.category_id, category_name: item.category_name })}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setAttendayCategoryToDelete({ category_id: item.category_id, category_name: item.category_name });
                                      setShowDeleteAttendayModal(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* キャストバック率関係 */}
              {activeMainItem === 'back-rate' && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-lg sm:text-xl md:text-2xl">キャストバック率関係</CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-1">
                          キャストごとのカテゴリー別バック率を設定します
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setShowBackRateAddModal(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        データ追加
                      </Button>
                    </div>
                    <div className="mt-4 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-3 sm:p-4 space-y-2">
                      <p className="text-sm font-medium text-gray-800">一括反映（選択した製品カテゴリーの列を全キャスト同率に）</p>
                      <p className="text-xs text-gray-600">0以上100未満のパーセントで指定します（例: 15 → 15%）。</p>
                      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2">
                        <div className="space-y-1 min-w-[160px] flex-1">
                          <Label className="text-xs">カテゴリー</Label>
                          <Select
                            value={bulkCastBackCategoryId || undefined}
                            onValueChange={(v) => setBulkCastBackCategoryId(v)}
                          >
                            <SelectTrigger className="h-9 sm:h-10">
                              <SelectValue placeholder="選択" />
                            </SelectTrigger>
                            <SelectContent>
                              {backRateCategories.map((cat) => (
                                <SelectItem key={cat.id} value={String(cat.id)}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 w-full sm:w-28">
                          <Label htmlFor="bulk-cast-back-pct" className="text-xs">バック率（%）</Label>
                          <Input
                            id="bulk-cast-back-pct"
                            type="number"
                            min={0}
                            max={99.99}
                            step={0.1}
                            placeholder="15"
                            value={bulkCastBackPercent}
                            onChange={(e) => setBulkCastBackPercent(e.target.value)}
                            className="h-9 sm:h-10"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 sm:h-10 w-full sm:w-auto shrink-0 bg-emerald-700 text-white hover:bg-emerald-800"
                          disabled={isBulkSavingCastBack || backRateCategories.length === 0}
                          onClick={() => void handleBulkApplyCastBackColumn()}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isBulkSavingCastBack ? 'animate-spin' : ''}`} />
                          {isBulkSavingCastBack ? '反映中...' : '全キャストへ適用'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {backRateCategories.length === 0 ? (
                      <div className="text-center py-12 sm:py-16 text-sm sm:text-base text-gray-500">
                        データがありません
                      </div>
                    ) : (
                      <>
                        {/* デスクトップ表示（テーブル） */}
                        <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0">
                          <div className="inline-block min-w-full align-middle">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="min-w-[150px]">キャスト名</TableHead>
                                  {backRateCategories.map((cat) => (
                                    <TableHead key={cat.id} className="text-center min-w-[120px]">
                                      <div className="flex items-center justify-center space-x-2">
                                        <span className="text-sm">{cat.name}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCategoryToDelete(cat);
                                            setShowDeleteCategoryModal(true);
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allUsers
                                  .filter(user => user.role === 'cast')
                                  .map((user) => (
                                  <TableRow key={user.id}>
                                    <TableCell className="font-semibold">{user.name}</TableCell>
                                    {backRateCategories.map((cat) => {
                                      const value = backRateData[user.id]?.[cat.id] || 0;
                                      const isEditing = editingCell?.castId === user.id && editingCell?.categoryId === cat.id;
                                      return (
                                        <TableCell key={cat.id} className="text-center">
                                          {isEditing ? (
                                            <div className="flex items-center justify-center space-x-2">
                                              <Input
                                                type="number"
                                                min="0"
                                                max="0.999"
                                                step="0.001"
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="w-20 h-8 text-sm"
                                                autoFocus
                                              />
                                              <Button
                                                size="sm"
                                                onClick={handleCellSave}
                                                disabled={isSavingBackRate}
                                                className="h-8 text-xs"
                                              >
                                                保存
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setEditingCell(null)}
                                                className="h-8 text-xs"
                                              >
                                                取消
                                              </Button>
                                            </div>
                                          ) : (
                                            <div
                                              className="cursor-pointer hover:bg-gray-100 p-2 rounded text-sm"
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
                        </div>
                        {/* タブレット・モバイル表示（カード） */}
                        <div className="lg:hidden space-y-4">
                          {allUsers
                            .filter(user => user.role === 'cast')
                            .map((user) => (
                            <Card key={user.id} className="border border-gray-200">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">{user.name}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {backRateCategories.map((cat) => {
                                  const value = backRateData[user.id]?.[cat.id] || 0;
                                  const isEditing = editingCell?.castId === user.id && editingCell?.categoryId === cat.id;
                                  return (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <span className="text-sm font-medium text-gray-700 truncate">{cat.name}</span>
                                        {backRateCategories.length > 0 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCategoryToDelete(cat);
                                              setShowDeleteCategoryModal(true);
                                            }}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                      {isEditing ? (
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                          <Input
                                            type="number"
                                            min="0"
                                            max="0.999"
                                            step="0.001"
                                            value={editingValue}
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            className="w-20 h-9 text-sm"
                                            autoFocus
                                          />
                                          <Button
                                            size="sm"
                                            onClick={handleCellSave}
                                            disabled={isSavingBackRate}
                                            className="h-9 text-xs px-2"
                                          >
                                            保存
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingCell(null)}
                                            className="h-9 text-xs px-2"
                                          >
                                            取消
                                          </Button>
                                        </div>
                                      ) : (
                                        <div
                                          className="cursor-pointer hover:bg-gray-100 px-3 py-1.5 rounded text-sm font-medium text-blue-600 flex-shrink-0"
                                          onClick={() => handleCellEdit(user.id, cat.id, value)}
                                        >
                                          {value > 0 ? (value * 100).toFixed(1) + '%' : '設定'}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* 指名バック率（admin/cast-back-rates の統合） */}
            {activeMainItem === 'nomination-back-rates' && (
              <NominationBackRatesPanel />
            )}

              {/* 100%給与反映 */}
              {activeMainItem === 'full-reflect' && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-lg sm:text-xl md:text-2xl">100%給与反映</CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-1">
                          100%給与反映のカテゴリーを設定します
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setShowFullReflectAddModal(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        データ追加
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {fullReflectCategories.length === 0 ? (
                      <div className="text-center py-12 sm:py-16 text-sm sm:text-base text-gray-500">
                        データがありません
                      </div>
                    ) : (
                      <>
                        {/* デスクトップ表示（テーブル） */}
                        <div className="hidden md:block overflow-x-auto">
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
                                  <TableCell className="font-semibold">{index + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm sm:text-base">{cat.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setFullReflectCategoryToDelete(cat);
                                          setShowDeleteFullReflectModal(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {/* モバイル表示（カード） */}
                        <div className="md:hidden space-y-3">
                          {fullReflectCategories.map((cat, index) => (
                            <Card key={cat.id} className="border border-gray-200">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                                      {index + 1}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setFullReflectCategoryToDelete(cat);
                                      setShowDeleteFullReflectModal(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 出勤日数に関係なく - データ追加モーダル */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">日別金額設定</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              製品カテゴリーを選択し、1～7日までの日別金額を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6 py-4">
            {!editingAttendayCategory && (
              <div className="space-y-2">
                <Label htmlFor="category-select" className="text-sm sm:text-base font-medium">製品カテゴリー</Label>
                <Select
                  value={selectedCategory?.toString() || ''}
                  onValueChange={(value) => setSelectedCategory(parseInt(value))}
                >
                  <SelectTrigger id="category-select" className="h-10 sm:h-11">
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
            )}

            <div className="space-y-3 sm:space-y-4">
              <Label className="text-sm sm:text-base font-medium">日別金額（1～7日）</Label>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2 p-3 rounded-md bg-gray-50 border border-gray-100">
                <div className="space-y-1 flex-1 min-w-[140px]">
                  <Label htmlFor="uniform-modal-amt" className="text-xs text-gray-600">全曜日に同じ金額（円）</Label>
                  <Input
                    id="uniform-modal-amt"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="一括入力"
                    value={uniformModalAmount}
                    onChange={(e) => setUniformModalAmount(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full sm:w-auto shrink-0"
                  onClick={() => {
                    const v = parseFloat(uniformModalAmount);
                    if (!Number.isFinite(v) || v < 0) {
                      setMessage({ type: 'error', text: '0以上の金額を入力してください' });
                      return;
                    }
                    setDayAmounts({ 1: v, 2: v, 3: v, 4: v, 5: v, 6: v, 7: v });
                    setMessage({ type: 'success', text: '1～7日に同額を反映しました（保存は「保存」ボタンで確定）' });
                  }}
                >
                  1～7日に反映
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className="space-y-2">
                    <Label htmlFor={`day-${day}`} className="text-xs sm:text-sm font-medium">
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
                        className="h-9 sm:h-10 text-sm"
                      />
                      <span className="text-xs sm:text-sm text-gray-600 font-medium">円</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={isSavingAttenday}
                className="h-10 sm:h-11 w-full sm:w-auto"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSaveAttenday}
                disabled={isSavingAttenday || !selectedCategory}
                className="bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">カテゴリー追加</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              キャストバック率関係に追加するカテゴリーを選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="back-rate-category-select" className="text-sm sm:text-base font-medium">カテゴリー</Label>
              <Select
                value={selectedBackRateCategory?.toString() || ''}
                onValueChange={(value) => setSelectedBackRateCategory(parseInt(value))}
              >
                <SelectTrigger id="back-rate-category-select" className="h-10 sm:h-11">
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowBackRateAddModal(false)}
                disabled={isSavingBackRate}
                className="h-10 sm:h-11 w-full sm:w-auto"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleAddBackRateCategory}
                disabled={isSavingBackRate || !selectedBackRateCategory}
                className="bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">カテゴリー追加</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              100%給与反映に追加するカテゴリーを選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-reflect-category-select" className="text-sm sm:text-base font-medium">カテゴリー</Label>
              <Select
                value={selectedFullReflectCategory?.toString() || ''}
                onValueChange={(value) => setSelectedFullReflectCategory(parseInt(value))}
              >
                <SelectTrigger id="full-reflect-category-select" className="h-10 sm:h-11">
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowFullReflectAddModal(false)}
                disabled={isSavingFullReflect}
                className="h-10 sm:h-11 w-full sm:w-auto"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleAddFullReflectCategory}
                disabled={isSavingFullReflect || !selectedFullReflectCategory}
                className="bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingFullReflect ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* カテゴリー削除確認モーダル */}
      <Dialog open={showDeleteCategoryModal} onOpenChange={setShowDeleteCategoryModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">カテゴリー削除</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              「{categoryToDelete?.name}」カテゴリーを削除しますか？
              <br />
              この操作により、このカテゴリーに関連する全てのデータが削除されます。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteCategoryModal(false);
                setCategoryToDelete(null);
              }}
              disabled={isDeletingCategory}
              className="h-10 sm:h-11 w-full sm:w-auto"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteCategory}
              disabled={isDeletingCategory}
              className="bg-red-600 hover:bg-red-700 h-10 sm:h-11 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeletingCategory ? '削除中...' : '削除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 出勤日数に関係なく - 削除確認モーダル */}
      <Dialog open={showDeleteAttendayModal} onOpenChange={setShowDeleteAttendayModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">カテゴリー削除</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              「{attendayCategoryToDelete?.category_name}」カテゴリーを削除しますか？
              <br />
              この操作により、このカテゴリーに関連する全ての日別金額データが削除されます。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteAttendayModal(false);
                setAttendayCategoryToDelete(null);
              }}
              disabled={isDeletingAttenday}
              className="h-10 sm:h-11 w-full sm:w-auto"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteAttendayCategory}
              disabled={isDeletingAttenday}
              className="bg-red-600 hover:bg-red-700 h-10 sm:h-11 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeletingAttenday ? '削除中...' : '削除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 100%給与反映 - 削除確認モーダル */}
      <Dialog open={showDeleteFullReflectModal} onOpenChange={setShowDeleteFullReflectModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">カテゴリー削除</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              「{fullReflectCategoryToDelete?.name}」カテゴリーを削除しますか？
              <br />
              この操作により、このカテゴリーに関連する全てのデータが削除されます。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteFullReflectModal(false);
                setFullReflectCategoryToDelete(null);
              }}
              disabled={isDeletingFullReflect}
              className="h-10 sm:h-11 w-full sm:w-auto"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteFullReflectCategory}
              disabled={isDeletingFullReflect}
              className="bg-red-600 hover:bg-red-700 h-10 sm:h-11 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeletingFullReflect ? '削除中...' : '削除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* すべてのキャスト給与状態モーダル */}
      <Dialog open={showCastStatusModal} onOpenChange={setShowCastStatusModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">すべてのキャスト給与状態</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {weekInfo && (
                <>
                  前週（{weekInfo.start} ～ {weekInfo.end}）の出勤日数と時給情報
                  <br />
                  基準日数: {weekInfo.standardDate}日 / レギュラー時給: ¥{weekInfo.regularWage.toLocaleString()} / アルバイト時給: ¥{weekInfo.arubaitoWage.toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingCastStatus ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-sm sm:text-base text-gray-500">読み込み中...</div>
              </div>
            ) : castStatusData.length === 0 ? (
              <div className="text-center py-12 text-sm sm:text-base text-gray-500">
                データがありません
              </div>
            ) : (
              <>
                {/* デスクトップ表示（テーブル） */}
                <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">キャスト名</TableHead>
                          <TableHead className="text-center min-w-[100px]">出勤日数</TableHead>
                          <TableHead className="text-center min-w-[120px]">給与区分</TableHead>
                          <TableHead className="text-center min-w-[120px]">現在の時給</TableHead>
                          {/* <TableHead className="text-center min-w-[120px]">適用時給</TableHead> */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {castStatusData.map((cast: any) => (
                          <TableRow key={cast.id}>
                            <TableCell className="font-semibold">{cast.name}</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${cast.attendanceDays >= cast.standardDate ? 'text-green-600' : 'text-blue-600'}`}>
                                {cast.attendanceDays}日
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                cast.wageType === 'regular' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {cast.wageType === 'regular' ? 'レギュラー' : 'アルバイト'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${
                                Math.abs(cast.hourlyPrice - cast.expectedWage) < 0.01
                                  ? 'text-gray-700'
                                  : 'text-orange-600'
                              }`}>
                                ¥{cast.hourlyPrice.toLocaleString()}
                              </span>
                            </TableCell>
                            {/* <TableCell className="text-center">
                              <span className="font-medium text-gray-700">
                                ¥{cast.expectedWage.toLocaleString()}
                              </span>
                            </TableCell> */}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {/* モバイル表示（カード） */}
                <div className="md:hidden space-y-3">
                  {castStatusData.map((cast: any) => (
                    <Card key={cast.id} className="border border-gray-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-base">{cast.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            cast.wageType === 'regular' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {cast.wageType === 'regular' ? 'レギュラー' : 'アルバイト'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">出勤日数:</span>
                            <span className={`ml-2 font-medium ${cast.attendanceDays >= cast.standardDate ? 'text-green-600' : 'text-blue-600'}`}>
                              {cast.attendanceDays}日
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">現在の時給:</span>
                            <span className={`ml-2 font-medium ${
                              Math.abs(cast.hourlyPrice - cast.expectedWage) < 0.01
                                ? 'text-gray-700'
                                : 'text-orange-600'
                            }`}>
                              ¥{cast.hourlyPrice.toLocaleString()}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">適用時給:</span>
                            <span className="ml-2 font-medium text-gray-700">
                              ¥{cast.expectedWage.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowCastStatusModal(false)}
              className="h-10 sm:h-11 w-full sm:w-auto"
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SalarySettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">読み込み中...</div>}>
      <SalarySettingsContent />
    </Suspense>
  );
}
