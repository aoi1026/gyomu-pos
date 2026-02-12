'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Clock, ShoppingCart, Utensils, Users, DollarSign, CheckCircle, Bell, Trash2, CreditCard, Wine, Plus, Minus, Edit2, Save, XCircle, LogOut, Pause, Play, Package, Coffee, Printer, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/mock-data';
import StripeProvider from '@/components/providers/StripeProvider';
import StripePaymentForm from '@/components/payment/StripePaymentForm';
import { useNotificationContext } from '@/lib/notification-context';
import { usePrinter } from '@/lib/printer-context';
import { fetchStoreName, fetchStoreAddress, fetchStorePhone, buildCurrentAndExtensionReceipts } from '@/lib/printing/receipt-builders';
import { buildEscPosRasterReceipt } from '@/lib/printing/escpos-raster';
import { printReceiptViaOs } from '@/lib/printing/os-print';

interface TableViewerProps {
  tableId: number | null;
  onClose: () => void;
}

interface SessionData {
  id: number;
  table_id: number;
  client: number;
  set_count: number;
  status: number;
  created_at: string;
  set_extensions?: Array<{ count: number; timestamp: number; price?: number }>;
  is_paused?: boolean;
  paused_at?: string;
  paused_elapsed?: number;
}

interface CartOrder {
  id: number;
  product_name: string;
  unit_price: number;
  amount: number;
  total_price: number;
  cast_name?: string;
  status: string;
}

interface ServiceOrder {
  id: number;
  service_name: string;
  amount: number;
  cast_name?: string;
  status: string;
}

interface Nomination {
  id: number;
  cast_name: string;
  type_id: 'main' | 'inside' | 'together';
  // 指名料金（指名登録 + 延長時加算の累計）
  cost?: number;
  // insideのまま本指名扱いになったか
  tomain_nomination?: number;
  updated_at?: string;
  created_at: string;
}

export default function TableViewer({ tableId, onClose }: TableViewerProps) {
  const { success, error, confirm } = useNotificationContext();
  const printer = usePrinter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [cartOrders, setCartOrders] = useState<CartOrder[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [setExtensionCountdown, setSetExtensionCountdown] = useState<number>(0);
  const [setExtensions, setSetExtensions] = useState<Array<{ count: number; timestamp: number; price?: number }>>([]);
  const [guestCount, setGuestCount] = useState<string>('');
  const [isEditingRemainingTime, setIsEditingRemainingTime] = useState(false);
  const [editingRemainingMinutes, setEditingRemainingMinutes] = useState<string>('');
  const [editingRemainingSeconds, setEditingRemainingSeconds] = useState<string>('');
  const [addCharges, setAddCharges] = useState<{[key: string]: number}>({});
  const [additionalServices, setAdditionalServices] = useState<Array<{
    type: 'bottle_keep' | 'vip_room' | 'karaoke';
    count: number;
    charge: number;
    timestamp: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [orderRequestStatus, setOrderRequestStatus] = useState<{[key: string]: 'pending' | 'sent' | 'accepted' | 'rejected'}>({});
  const [serviceRequestStatus, setServiceRequestStatus] = useState<{[key: string]: 'pending' | 'sent' | 'accepted' | 'rejected'}>({});
  
  // セット延長関連
  const [showSetExtensionDialog, setShowSetExtensionDialog] = useState(false);
  const [extensionGuestCount, setExtensionGuestCount] = useState<string>('');
  
  // 同伴指名関連
  const [showCastSelectionDialog, setShowCastSelectionDialog] = useState(false);
  const [casts, setCasts] = useState<any[]>([]);
  const [isCastsLoading, setIsCastsLoading] = useState(false);
  
  // 決済関連
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCashPaymentDialog, setShowCashPaymentDialog] = useState(false);
  const [showStoreCreditCardPaymentDialog, setShowStoreCreditCardPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [cashPaymentAmount, setCashPaymentAmount] = useState<string>('');
  const [storeCreditCardPaymentAmount, setStoreCreditCardPaymentAmount] = useState<string>('');
  const [isPaymentCompleted, setIsPaymentCompleted] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isProcessingStoreCreditCardPayment, setIsProcessingStoreCreditCardPayment] = useState<boolean>(false);

  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptPreviewData, setReceiptPreviewData] = useState<{ extension: import('@/lib/printing/escpos-raster').ReceiptPayload; current: import('@/lib/printing/escpos-raster').ReceiptPayload } | null>(null);

  const buildReceiptData = async () => {
    if (!session || !tableId) return null;
    const [storeName, footerAddress, footerPhone] = await Promise.all([
      fetchStoreName(),
      fetchStoreAddress(),
      fetchStorePhone(),
    ]);
    const tableName = String(tableData?.name ? `テーブル: ${tableData.name}` : `テーブル: ${tableId}`);
    const issuedAt = new Date();
    const built = buildCurrentAndExtensionReceipts({
      storeName,
      tableName,
      issuedAt,
      cartOrders,
      orderRequestStatus,
      additionalServices,
      guestCount: String(guestCount || ''),
      addCharges,
      setExtensions,
      nominations: nominations as any,
    });
    return {
      ...built,
      extension: { ...built.extension, footerAddress: footerAddress || undefined, footerPhone: footerPhone || undefined },
      current: { ...built.current, footerAddress: footerAddress || undefined, footerPhone: footerPhone || undefined },
    };
  };

  const tryAutoPrintReceipts = async () => {
    // Only auto-print when a printer is already connected from the dashboard button.
    if (printer.status !== 'connected') return;
    if (!session || !tableId) return;
    if (!tableData) return;

    try {
      const built = await buildReceiptData();
      if (!built) return;
      const { extension, current } = built;
      await printer.write(buildEscPosRasterReceipt(extension));
      await printer.write(buildEscPosRasterReceipt(current));
    } catch (e) {
      console.error('自動領収書印刷エラー:', e);
      error('エラー', '領収書の自動印刷に失敗しました（プリンター接続を確認してください）');
    }
  };

  const handlePrintReceipt = async () => {
    if (!session || !tableId) {
      error('エラー', 'セッション情報がありません');
      return;
    }
    try {
      const built = await buildReceiptData();
      if (!built) return;
      const { extension, current } = built;
      if (printer.status === 'connected') {
        await printer.write(buildEscPosRasterReceipt(extension));
        await printer.write(buildEscPosRasterReceipt(current));
      } else {
        printReceiptViaOs([extension, current]);
      }
      success('印刷', '領収書を印刷しました');
    } catch (e) {
      console.error('領収書印刷エラー:', e);
      error('エラー', '領収書の印刷に失敗しました');
    }
  };

  const handleShowReceiptPreview = async () => {
    if (!session || !tableId) {
      error('エラー', 'セッション情報がありません');
      return;
    }
    try {
      const built = await buildReceiptData();
      if (!built) return;
      setReceiptPreviewData({ extension: built.extension, current: built.current });
      setShowReceiptPreview(true);
    } catch (e) {
      console.error('領収書プレビューエラー:', e);
      error('エラー', 'プレビューの生成に失敗しました');
    }
  };
  
  // 合計値の手動編集関連（テーブルごとに管理）
  const [isEditingTotal, setIsEditingTotal] = useState<boolean>(false);
  const [manualTotals, setManualTotals] = useState<{[tableId: number]: number | null}>({});
  const [editingTotalValue, setEditingTotalValue] = useState<string>('');
  
  // 現在のテーブルの手動合計値を取得
  const getManualTotal = (): number | null => {
    if (!tableId) return null;
    return manualTotals[tableId] ?? null;
  };
  
  // 現在のテーブルの手動合計値を設定
  const setManualTotal = (value: number | null) => {
    if (!tableId) return;
    setManualTotals(prev => ({
      ...prev,
      [tableId]: value
    }));
  };

  // 合計編集の権限制御（super_admin のみ許可）
  const ensureSuperAdminForTotalEdit = (): boolean => {
    if (!isSuperAdmin) {
      error('権限エラー', '注文合計の変更はスーパー管理者のみが実行できます');
      return false;
    }
    return true;
  };
  
  // 注文無効化フラグ（isPaymentCompletedの宣言後に定義）
  const isTimeExpired = setExtensionCountdown <= 0;
  const isOrderingDisabled = isTimeExpired || isPaymentCompleted;
  
  // タブ関連
  const [leftMode, setLeftMode] = useState<'order' | 'nomination' | 'service'>('order');
  
  // メニュー関連
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [selectedCastForOrder, setSelectedCastForOrder] = useState<string>('none');
  const [isForCast, setIsForCast] = useState<boolean>(false);
  const [isOrderCartOpen, setIsOrderCartOpen] = useState(false);
  
  // 指名関連
  const [currentNominationType, setCurrentNominationType] = useState<'inside' | 'main' | 'together' | null>(null);
  const [showNominationCastDialog, setShowNominationCastDialog] = useState(false);
  const [isNominationsLoading, setIsNominationsLoading] = useState(false);
  
  // サービス関連
  const [services, setServices] = useState<any[]>([]);
  const [isServicesLoading, setIsServicesLoading] = useState(true);
  const [showServiceOrderDialog, setShowServiceOrderDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [serviceOrderQuantity, setServiceOrderQuantity] = useState<number>(1);
  const [showBottleKeepDialog, setShowBottleKeepDialog] = useState(false);
  const [showVipRoomDialog, setShowVipRoomDialog] = useState(false);
  const [showKaraokeDialog, setShowKaraokeDialog] = useState(false);

  const getNominationTypeLabel = (type: 'main' | 'inside' | 'together') => {
    switch (type) {
      case 'main':
        return '本指名';
      case 'inside':
        return '場内指名';
      case 'together':
        return '同伴指名';
      default:
        return '指名';
    }
  };

  // 管理者ロール（super_admin）の判定
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('admin_auth');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const role = parsed?.role;
      if (role === 'super_admin' || role === 'superadmin') {
        setIsSuperAdmin(true);
      }
    } catch {
      // パースエラー時は何もしない（権限なし扱い）
    }
  }, []);

  // テーブル情報を取得
  const loadTableData = async () => {
    if (!tableId) return;
    
    try {
      const response = await fetch('/api/tables');
      const result = await response.json();
      
      if (result.success && result.tables) {
        const table = result.tables.find((t: any) => t.id === tableId);
        if (table) {
          setTableData(table);
        }
      }
    } catch (err) {
      console.error('テーブル情報取得エラー:', err);
    }
  };

  // セッション情報を取得
  const loadSession = async () => {
    if (!tableId) return;
    
    try {
      const response = await fetch('/api/sessions');
      const result = await response.json();
      
      if (result.success) {
        // 該当テーブルのアクティブなセッション（status=1）を取得
        const activeSession = result.data.find((s: SessionData) => 
          s.table_id === tableId && s.status === 1
        );
        
        if (activeSession) {
          // セッション情報が変更された場合のみ更新（set_count、set_extensions、client、停止/再開状態、created_atの変更をチェック）
          setSession(prev => {
            const prevExtensionsStr = JSON.stringify(prev?.set_extensions || []);
            const newExtensionsStr = JSON.stringify(activeSession.set_extensions || []);
            if (prev?.id !== activeSession.id || 
                prev?.set_count !== activeSession.set_count ||
                prev?.client !== activeSession.client ||
                prev?.is_paused !== activeSession.is_paused ||
                prev?.paused_at !== activeSession.paused_at ||
                prev?.paused_elapsed !== activeSession.paused_elapsed ||
                prev?.created_at !== activeSession.created_at ||
                prevExtensionsStr !== newExtensionsStr) {
              return activeSession;
            }
            return prev;
          });
          
          setGuestCount(activeSession.client?.toString() || '');
          
          // セット延長情報を取得（セッション情報のset_extensionsから取得）
          const extensions = activeSession.set_extensions || [];
          setSetExtensions(prev => {
            // 変更があった場合のみ更新
            if (JSON.stringify(prev) !== JSON.stringify(extensions)) {
              return extensions;
            }
            return prev;
          });
          
          // 初回読み込み時のみデータを読み込む
          const isFirstLoad = !session || session.id !== activeSession.id;
          if (isFirstLoad) {
            await Promise.all([
              loadCartOrders(activeSession.id),
              loadServiceOrders(activeSession.id),
              loadNominations(activeSession.id),
              loadAddCharges(),
              loadMenuData(),
              loadServices(),
              loadCasts()
            ]);
          }
          
          // 決済完了状態を確認（セッションのcostが0より大きい場合）
          if (activeSession.cost && parseFloat(activeSession.cost) > 0) {
            setIsPaymentCompleted(true);
            setPaidAmount(parseFloat(activeSession.cost));
          } else {
            setIsPaymentCompleted(false);
            setPaidAmount(0);
          }
        } else {
          // セッションが終了した場合
          if (session) {
            setSession(null);
            setLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('セッション情報取得エラー:', error);
    } finally {
      if (!session) {
        setLoading(false);
      }
    }
  };

  // 注文カートを取得
  const loadCartOrders = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/salesorder?session_id=${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        // 変更があった場合のみ更新
        setCartOrders(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(result.data || []);
          if (prevStr !== newStr) {
            return result.data || [];
          }
          return prev;
        });
        
        // ステータスを設定
        (result.data || []).forEach((order: CartOrder) => {
          if (order.status === 'pending') {
            setOrderRequestStatus(prev => {
              if (prev[order.id] !== 'sent') {
                return { ...prev, [order.id]: 'sent' };
              }
              return prev;
            });
          } else if (order.status === 'accepted') {
            setOrderRequestStatus(prev => {
              if (prev[order.id] !== 'accepted') {
                return { ...prev, [order.id]: 'accepted' };
              }
              return prev;
            });
          } else if (order.status === 'rejected') {
            setOrderRequestStatus(prev => {
              if (prev[order.id] !== 'rejected') {
                return { ...prev, [order.id]: 'rejected' };
              }
              return prev;
            });
          }
        });
      }
    } catch (error) {
      console.error('注文カート取得エラー:', error);
    }
  };

  // サービス注文を取得
  const loadServiceOrders = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/serviceorder?session_id=${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        // 変更があった場合のみ更新
        setServiceOrders(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(result.data || []);
          if (prevStr !== newStr) {
            return result.data || [];
          }
          return prev;
        });
        
        // ステータスを設定
        (result.data || []).forEach((order: ServiceOrder) => {
          if (order.status) {
            setServiceRequestStatus(prev => {
              if (prev[order.id] !== order.status) {
                return { ...prev, [order.id]: order.status as any };
              }
              return prev;
            });
          } else {
            setServiceRequestStatus(prev => {
              if (prev[order.id] !== 'pending') {
                return { ...prev, [order.id]: 'pending' };
              }
              return prev;
            });
          }
        });
      }
    } catch (error) {
      console.error('サービス注文取得エラー:', error);
    }
  };

  // 指名リストを取得
  const loadNominations = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/nominations?session_id=${sessionId}&_ts=${Date.now()}`, { cache: 'no-store' });
      const result = await response.json();
      
      if (result.success) {
        // 変更があった場合のみ更新
        setNominations(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(result.nominations || []);
          if (prevStr !== newStr) {
            return result.nominations || [];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('指名リスト取得エラー:', error);
    }
  };

  // 追加サービスをAPIから取得
  const loadAdditionalServices = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/additional-services?session_id=${sessionId}`);
      const result = await response.json();
      if (result.success) {
        const newServices = result.data || [];
        // データが変更された場合のみ状態を更新（ちらつき防止）
        setAdditionalServices(prev => {
          const prevStr = JSON.stringify(prev.map((s: any) => ({ id: s.id, type: s.type, count: s.count, charge: s.charge, timestamp: s.timestamp })));
          const newStr = JSON.stringify(newServices.map((s: any) => ({ id: s.id, type: s.type, count: s.count, charge: s.charge, timestamp: s.timestamp })));
          if (prevStr !== newStr) {
            return newServices;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('追加サービス取得エラー:', error);
    }
  };

  // 追加料金を取得
  const loadAddCharges = async () => {
    try {
      const response = await fetch('/api/add-charges');
      const result = await response.json();
      
      if (result.success && result.charges) {
        const chargesMap: {[key: string]: number} = {};
        result.charges.forEach((charge: any) => {
          chargesMap[charge.charge_name] = parseFloat(charge.value) || 0;
        });
        setAddCharges(chargesMap);
      }
    } catch (error) {
      console.error('追加料金取得エラー:', error);
    }
  };

  // メニューデータを取得
  const loadMenuData = async () => {
    try {
      setIsMenuLoading(true);
      const [categoriesResponse, productsResponse] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products')
      ]);
      
      const categoriesResult = await categoriesResponse.json();
      const productsResult = await productsResponse.json();
      
      if (categoriesResult.success && productsResult.success) {
        setMenuCategories(categoriesResult.categories || []);
        setMenuItems(productsResult.products?.filter((p: any) => Number(p.amount) > 0) || []);
      }
    } catch (error) {
      console.error('メニューデータ取得エラー:', error);
    } finally {
      setIsMenuLoading(false);
    }
  };

  // 注文カートから削除
  const removeFromCart = async (orderId: string, currentStatus?: string) => {
    try {
      // 承認待ち（pending/sent）のみ削除可能
      if (currentStatus && !['pending', 'sent'].includes(currentStatus)) {
        error('エラー', '承認済みの注文は削除できません');
        return;
      }

      const res = await fetch(`/api/salesorder/${orderId}`, { method: 'DELETE' });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result?.error || '削除に失敗しました');
      }

      // クライアント状態を更新
      setCartOrders(prev => prev.filter(order => order.id.toString() !== orderId));
      setOrderRequestStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[orderId];
        return newStatus;
      });
      success('削除完了', '承認待ちの注文を削除しました');
    } catch (err) {
      console.error('注文削除エラー:', err);
      error('エラー', err instanceof Error ? err.message : '注文の削除に失敗しました');
    }
  };

  // 指名リストから削除
  const deleteNominationRecord = async (nominationId: string) => {
    if (!session) return;
    
    confirm(
      '指名削除',
      'この指名を削除しますか？',
      async () => {
        try {
          const response = await fetch(`/api/nominations?id=${nominationId}`, {
            method: 'DELETE'
          });
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || '指名の削除に失敗しました');
          }
          
          success('削除完了', '指名を削除しました');
          await loadNominations(session.id);
          await loadAdditionalServices(session.id);
        } catch (err) {
          console.error('指名削除エラー:', err);
          error('エラー', err instanceof Error ? err.message : '指名の削除に失敗しました');
        }
      }
    );
  };

  // サービス注文カートから削除
  const removeFromServiceOrders = async (orderId: string) => {
    if (!session) return;
    
    confirm(
      'サービス注文削除',
      'このサービス注文を削除しますか？',
      async () => {
        try {
          const res = await fetch(`/api/serviceorder/${orderId}`, { method: 'DELETE' });
          const result = await res.json().catch(() => ({}));
          if (!res.ok || !result.success) {
            throw new Error(result?.error || '削除に失敗しました');
          }

          // クライアント状態を更新
          setServiceOrders(prev => prev.filter(order => order.id.toString() !== orderId));
          setServiceRequestStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[orderId];
            return newStatus;
          });
          success('削除完了', 'サービス注文を削除しました');
        } catch (err) {
          console.error('サービス注文削除エラー:', err);
          error('エラー', err instanceof Error ? err.message : 'サービス注文の削除に失敗しました');
        }
      }
    );
  };

  // 商品をカートに追加
  const addToCart = async (product: any) => {
    if (!session) return;
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、商品の追加はできません' : 'セット時間が終了したため、商品の追加はできません');
      return;
    }
    
    setSelectedProduct(product);
    setOrderQuantity(1);
    setSelectedCastForOrder('none');
    setIsForCast(false);
    setShowOrderDialog(true);
    if (casts.length === 0) {
      loadCasts();
    }
  };

  // 注文を送信
  const handleOrderSubmit = async () => {
    if (!session || !selectedProduct || !tableId) return;
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、商品の追加はできません' : 'セット時間が終了したため、商品の追加はできません');
      return;
    }

    try {
      const response = await fetch('/api/salesorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cast_id: selectedCastForOrder && selectedCastForOrder !== 'none' ? parseInt(selectedCastForOrder) : null,
          product_id: selectedProduct.id,
          amount: orderQuantity,
          table_id: tableId,
          session_id: session.id,
          for_cast: isForCast ? 1 : 0
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('注文完了', '注文が確定されました');
        setShowOrderDialog(false);
        setSelectedProduct(null);
        setOrderQuantity(1);
        setSelectedCastForOrder('none');
        setIsForCast(false);
        await loadCartOrders(session.id);
        
        // 即座に送信済みステータスに設定
        if (result.data && result.data.id) {
          setOrderRequestStatus(prev => ({ ...prev, [result.data.id]: 'sent' }));
        }

        // 管理者に通知を送信
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'sales_order',
              table_id: tableId,
              table_label: tableData?.name || `テーブル${tableId}`,
              cast_name: selectedCastForOrder && selectedCastForOrder !== 'none' ? 
                casts.find(c => c.id.toString() === selectedCastForOrder)?.name || '未選択' : '未選択',
              message: `${selectedProduct.name} x${orderQuantity} の注文が入りました`,
              priority: 'high'
            }),
          });
        } catch (notificationError) {
          console.error('通知送信エラー:', notificationError);
        }
      } else {
        error('エラー', result.error || '注文の確定に失敗しました');
      }
    } catch (err) {
      console.error('注文エラー:', err);
      error('エラー', '注文の確定に失敗しました');
    }
  };

  // セッション終了機能
  const endSession = async () => {
    if (!session || !tableId) return;
    
    confirm(
      'セッション終了',
      'セッションを終了しますか？',
      async () => {
        try {
          const endAt = new Date().toISOString();
          
          // データベースにセッション終了情報を保存
          const response = await fetch(`/api/sessions/${session.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              end_at: endAt,
              set_count: session.set_count || 1,
              client: session.client || undefined,
              status: 0,
              set_extensions: []
            }),
          });

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'セッション終了情報の保存に失敗しました');
          }

          // セッションをクリア
          setSession(null);
          
          success('セッション終了', 'セッションを終了しました');
          
          // 親コンポーネントに通知してデータを更新
          if (onClose) {
            // 少し待ってから閉じる（成功メッセージを表示するため）
            setTimeout(() => {
              onClose();
            }, 1000);
          }
        } catch (err) {
          console.error('セッション終了エラー:', err);
          error('エラー', `セッション終了に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
        }
      }
    );
  };

  // セット延長カウントダウンタイマー（リアルタイム更新）
  useEffect(() => {
    if (!session) return;
    
    const updateCountdown = () => {
      const setCount = session.set_count || 1;
      const setDuration = 3600; // 1セット = 3600秒
      const totalSeconds = setCount * setDuration;
      
      // セッション開始時刻から経過時間を計算
      const sessionStart = new Date(session.created_at).getTime();
      const now = Date.now();
      let elapsed = Math.floor((now - sessionStart) / 1000);
      
      // 停止時間を考慮
      const pausedElapsed = session.paused_elapsed || 0;
      if (session.is_paused && session.paused_at) {
        // 現在停止中の場合、停止開始時刻からの経過時間を累積停止時間に追加
        const pausedAt = new Date(session.paused_at).getTime();
        const currentPauseTime = Math.floor((now - pausedAt) / 1000);
        // 停止中は経過時間から累積停止時間と現在の停止時間を減算（タイマーは進まない）
        elapsed -= (pausedElapsed + currentPauseTime);
      } else {
        // 停止していない場合、累積停止時間のみを減算
        elapsed -= pausedElapsed;
      }
      
      const remaining = Math.max(0, totalSeconds - elapsed);
      
      setSetExtensionCountdown(remaining);
    };
    
    // 初回更新
    updateCountdown();
    
    // 停止中の場合でも表示を更新するため、1秒ごとに更新
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [session]);

  // データを読み込む
  useEffect(() => {
    if (tableId) {
      loadTableData();
      loadSession();
      // テーブルが変更されたときに編集モードをリセット
      setIsEditingTotal(false);
      setEditingTotalValue('');
      // セッションが新しく作成された場合に備えて、少し待ってから再読み込み
      const timeout = setTimeout(() => {
        loadSession();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [tableId]);

  // 定期的にデータを更新（リアルタイム更新）
  useEffect(() => {
    if (!tableId) return;
    
    // セッションがない場合でも、新しく作成されたセッションを検出するために定期的にチェック
    const checkSessionInterval = setInterval(() => {
      loadSession();
    }, 1000); // 1秒ごとにセッションをチェック
    
    if (session) {
      // セッションがある場合、注文データも更新
      loadCartOrders(session.id);
      loadServiceOrders(session.id);
      loadNominations(session.id);
      loadMenuData();
      
      // 注文データを1秒ごとに更新
      const dataUpdateInterval = setInterval(() => {
        loadCartOrders(session.id);
        loadServiceOrders(session.id);
        loadNominations(session.id);
        loadAdditionalServices(session.id);
      }, 1000);
      
      return () => {
        clearInterval(checkSessionInterval);
        clearInterval(dataUpdateInterval);
      };
    }
    
    return () => clearInterval(checkSessionInterval);
  }, [session?.id, tableId]);

  if (!tableId) return null;

  // 指名料金の合計を計算（テーブルページと同じロジック）
  const calculateNominationCharges = (): number => {
    // nominations APIのcostは「指名登録 + 延長時加算」の累計になっている前提
    return nominations.reduce((sum, n) => {
      const v = Number((n as any).cost);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  };

  // キャストリストを取得
  const loadCasts = async () => {
    setIsCastsLoading(true);
    try {
      // 出勤中のキャストのみを取得
      const response = await fetch('/api/casts?only_active=true');
      const result = await response.json();
      if (result.success) {
        setCasts(result.data || []);
      }
    } catch (error) {
      console.error('キャスト取得エラー:', error);
    } finally {
      setIsCastsLoading(false);
    }
  };

  // サービスデータを取得
  const loadServices = async () => {
    try {
      setIsServicesLoading(true);
      const response = await fetch('/api/services');
      const result = await response.json();
      if (result.success) {
        setServices(result.services || []);
      }
    } catch (error) {
      console.error('サービス取得エラー:', error);
    } finally {
      setIsServicesLoading(false);
    }
  };

  // 指名処理
  const handleNomination = async (castId: string, castName: string, typeId: 'main' | 'inside' | 'together') => {
    if (!session || !tableId) return;
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、指名を追加できません' : 'セット時間が終了したため、指名を追加できません');
      return;
    }

    try {
      // 指名料金を計算
      let charges = addCharges;
      if (Object.keys(charges).length === 0) {
        const chargesResponse = await fetch('/api/add-charges');
        const chargesResult = await chargesResponse.json();
        if (chargesResult.success && chargesResult.charges) {
          const chargesMap: {[key: string]: number} = {};
          chargesResult.charges.forEach((charge: any) => {
            chargesMap[charge.charge_name] = parseFloat(charge.value) || 0;
          });
          charges = chargesMap;
          setAddCharges(chargesMap);
        }
      }

      let nominationCharge = 0;
      if (typeId === 'main') {
        nominationCharge = charges['main'] || 0;
      } else if (typeId === 'inside') {
        nominationCharge = charges['inside'] || 0;
      } else if (typeId === 'together') {
        const mainCharge = charges['main'] || 0;
        const togetherCharge = charges['together'] || 0;
        nominationCharge = mainCharge + togetherCharge;
      }

      // 指名を登録
      const response = await fetch('/api/nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId: parseInt(castId, 10),
          tableId: tableId,
          sessionId: session.id,
          typeId: typeId,
          cost: nominationCharge
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowNominationCastDialog(false);
        await loadNominations(session.id);
        await loadAdditionalServices(session.id);
        success('指名登録', '指名を登録しました');
      } else {
        error('エラー', result.error || '指名の登録に失敗しました');
      }
    } catch (err) {
      console.error('指名登録エラー:', err);
      error('エラー', '指名の登録に失敗しました');
    }
  };

  // サービス注文処理
  const handleServiceOrder = (service: any) => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、サービスを注文できません' : 'セット時間が終了したため、サービスを注文できません');
      return;
    }
    setSelectedService(service);
    setServiceOrderQuantity(1);
    setShowServiceOrderDialog(true);
  };

  // セット延長処理
  const handleSetExtension = () => {
    setShowSetExtensionDialog(true);
  };

  const confirmSetExtension = async () => {
    if (!extensionGuestCount || extensionGuestCount.trim() === '' || !session) {
      error('エラー', '人数を入力してください');
      return;
    }

    const count = parseInt(extensionGuestCount);
    if (isNaN(count) || count <= 0) {
      error('エラー', '有効な人数を入力してください');
      return;
    }

    // 人数がテーブルの定員を超えていないかチェック
    if (tableData && tableData.capacity && count > tableData.capacity) {
      error('エラー', `人数はテーブルの定員（${tableData.capacity}名）以下で入力してください`);
      return;
    }

    // 延長情報を追加
    const newExtension = { count, timestamp: Date.now() };
    const updatedExtensions = [...setExtensions, newExtension];
    
    // セットカウントを1増加
    const newSetCount = (session.set_count || 1) + 1;
    
    // DBにset_countとset_extensionsを同期
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          set_count: newSetCount,
          set_extensions: updatedExtensions
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'セット延長に失敗しました');
      }
      
      setSetExtensions(updatedExtensions);
      setShowSetExtensionDialog(false);
      setExtensionGuestCount('');
      await loadSession();
      success('セット延長', `${count}名でセットを延長しました（60分追加）`);
    } catch (err) {
      console.error('セット延長エラー:', err);
      error('エラー', err instanceof Error ? err.message : 'セット延長に失敗しました');
    }
  };

  // 1セットキャンセル処理
  const handleCancelSet = async () => {
    if (!session) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }

    if (setExtensions.length === 0) {
      error('エラー', 'キャンセルできるセットがありません');
      return;
    }

    if (setExtensionCountdown < 3600) {
      error('エラー', '現在の時間が60分未満のため、セットをキャンセルできません');
      return;
    }

    confirm(
      'セットキャンセル',
      '最後のセット延長をキャンセルしますか？60分が減算され、料金も差し引かれます。',
      async () => {
        // 最後の延長情報を取得
        const lastExtension = setExtensions[setExtensions.length - 1];
        
        // 延長情報から最後の項目を削除
        const updatedExtensions = setExtensions.slice(0, -1);
        
        // セットカウントを1減少
        const newSetCount = Math.max(1, (session.set_count || 1) - 1);
        
        // DBにset_countとset_extensionsを同期
        try {
          await fetch(`/api/sessions/${session.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              set_count: newSetCount,
              set_extensions: updatedExtensions
            })
          });
          
          setSetExtensions(updatedExtensions);
          await loadSession();
          success('セットキャンセル', `${lastExtension.count}名分のセットをキャンセルしました`);
        } catch (err) {
          console.error('セットキャンセルエラー:', err);
          error('エラー', 'セットキャンセルに失敗しました');
        }
      }
    );
  };

  // 残り時間変更処理（停止中のみ）
  const handleChangeRemainingTime = async () => {
    if (!session || !session.is_paused) {
      error('エラー', '停止中のみ残り時間を変更できます');
      return;
    }

    const minutes = parseInt(editingRemainingMinutes) || 0;
    const seconds = parseInt(editingRemainingSeconds) || 0;
    const newRemainingSeconds = minutes * 60 + seconds;

    if (newRemainingSeconds < 0) {
      error('エラー', '残り時間は0以上である必要があります');
      return;
    }

    try {
      // 新しい残り時間から逆算してcreated_atを計算
      const setCount = session.set_count || 1;
      const setDuration = 3600; // 1セット = 3600秒
      const totalSeconds = setCount * setDuration;
      
      // 新しい残り時間から経過時間を計算
      const elapsed = totalSeconds - newRemainingSeconds;
      
      // 停止時間を考慮して新しいcreated_atを計算
      const pausedElapsed = session.paused_elapsed || 0;
      const pausedAt = session.paused_at ? new Date(session.paused_at).getTime() : Date.now();
      const currentPauseDuration = Math.floor((Date.now() - pausedAt) / 1000);
      const totalPausedTime = pausedElapsed + currentPauseDuration;
      
      // 新しいcreated_at = 現在時刻 - 経過時間 - 累積停止時間
      const newCreatedAt = new Date(Date.now() - (elapsed + totalPausedTime) * 1000).toISOString();

      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          created_at: newCreatedAt
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '残り時間の変更に失敗しました');
      }

      // 更新されたセッションデータを直接状態に反映（即座に表示を更新）
      if (result.data) {
        setSession(prev => prev ? { ...prev, ...result.data } : result.data);
      }

      setIsEditingRemainingTime(false);
      setEditingRemainingMinutes('');
      setEditingRemainingSeconds('');
      await loadSession();
      setTimeout(() => {
        loadSession();
      }, 500);
      success('残り時間変更', '残り時間を変更しました');
    } catch (err) {
      console.error('残り時間変更エラー:', err);
      error('エラー', err instanceof Error ? err.message : '残り時間の変更に失敗しました');
    }
  };

  // 停止/再開処理
  const handlePauseResume = async () => {
    if (!session) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }
    
    const isCurrentlyPaused = session.is_paused || false;
    const pausedElapsed = session.paused_elapsed || 0;
    const now = new Date().toISOString();
    
    if (isCurrentlyPaused) {
      // 再開: 停止時間を累積に追加
      const pausedAt = session.paused_at ? new Date(session.paused_at).getTime() : Date.now();
      const currentPauseDuration = Math.floor((Date.now() - pausedAt) / 1000);
      const newPausedElapsed = pausedElapsed + currentPauseDuration;
      
      try {
        const response = await fetch(`/api/sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_paused: false,
            paused_at: null,
            paused_elapsed: newPausedElapsed
          })
        });
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || '再開に失敗しました');
        }
        
        // 編集モードをリセット
        setIsEditingRemainingTime(false);
        setEditingRemainingMinutes('');
        setEditingRemainingSeconds('');
        
        // 即座にセッション情報を更新して状態を反映
        await loadSession();
        // 状態が確実に反映されるように少し待ってから再度更新
        setTimeout(() => {
          loadSession();
        }, 500);
        success('再開', 'セット延長タイマーを再開しました');
      } catch (err) {
        console.error('再開エラー:', err);
        error('エラー', err instanceof Error ? err.message : 'タイマーの再開に失敗しました');
      }
    } else {
      // 停止: 停止時刻を記録
      try {
        const response = await fetch(`/api/sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_paused: true,
            paused_at: now,
            paused_elapsed: pausedElapsed
          })
        });
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || '停止に失敗しました');
        }
        
        // 即座にセッション情報を更新して状態を反映
        await loadSession();
        // 状態が確実に反映されるように少し待ってから再度更新
        setTimeout(() => {
          loadSession();
        }, 500);
        success('停止', 'セット延長タイマーを停止しました');
      } catch (err) {
        console.error('停止エラー:', err);
        error('エラー', err instanceof Error ? err.message : 'タイマーの停止に失敗しました');
      }
    }
  };

  // 同伴指名処理
  const handleTogetherNomination = () => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、指名を追加できません' : 'セット時間が終了したため、指名を追加できません');
      return;
    }
    loadCasts();
    setShowCastSelectionDialog(true);
  };

  const submitTogetherNomination = async (castId: string, castName: string) => {
    if (!session || !tableId) return;
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、指名を追加できません' : 'セット時間が終了したため、指名を追加できません');
      return;
    }

    try {
      // 指名料金を計算
      let charges = addCharges;
      if (Object.keys(charges).length === 0) {
        const chargesResponse = await fetch('/api/add-charges');
        const chargesResult = await chargesResponse.json();
        if (chargesResult.success && chargesResult.charges) {
          const chargesMap: {[key: string]: number} = {};
          chargesResult.charges.forEach((charge: any) => {
            chargesMap[charge.charge_name] = parseFloat(charge.value) || 0;
          });
          charges = chargesMap;
          setAddCharges(chargesMap);
        }
      }

      const mainCharge = charges['main'] || 0;
      const togetherCharge = charges['together'] || 0;
      const nominationCharge = mainCharge + togetherCharge;

      // 指名を登録
      const response = await fetch('/api/nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId: parseInt(castId, 10),
          tableId: tableId,
          sessionId: session.id,
          typeId: 'together',
          cost: nominationCharge
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowCastSelectionDialog(false);
        await loadNominations(session.id);
        // サービスページの総額明細に反映されるように、即座に再取得
        await loadAdditionalServices(session.id);
      }
    } catch (err) {
      console.error('同伴指名登録エラー:', err);
    }
  };

  // 決済処理
  const handlePayment = () => {
    setShowPaymentMethodDialog(true);
  };

  const handleCashPayment = () => {
    setShowPaymentMethodDialog(false);
    setShowCashPaymentDialog(true);
    setCashPaymentAmount('');
  };

  const handleCreditCardPayment = () => {
    const paymentAmount = calculatePaymentAmount();
    setPaymentAmount(paymentAmount);
    setShowPaymentMethodDialog(false);
    setShowPaymentDialog(true);
  };

  const handleStoreCreditCardPayment = () => {
    setShowPaymentMethodDialog(false);
    setShowStoreCreditCardPaymentDialog(true);
    setStoreCreditCardPaymentAmount('');
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!session) return;
    
    try {
      // セッションの現在のcostを取得
      const sessionResponse = await fetch(`/api/sessions?id=${session.id}`);
      const sessionResult = await sessionResponse.json();
      const currentCost = sessionResult.success && sessionResult.data?.[0]?.cost ? parseFloat(sessionResult.data[0].cost) : 0;
      const newCost = currentCost + paymentAmount;
      
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: newCost, pay_type: 2 })
      });

      // 決済履歴を保存（失敗しても決済フローは継続）
      fetch('/api/session-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, pay_type: 2, amount: paymentAmount })
      }).catch(() => {});
      
      // 承認待ちの注文を拒否
      const ordersToReject = cartOrders.filter((order: any) => {
        const st = orderRequestStatus[order.id] || order.status;
        return st === 'pending' || st === 'sent';
      });
      await Promise.all(
        ordersToReject.map((order: any) =>
          fetch(`/api/salesorder/${order.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' })
          }).catch(err => console.error('注文拒否更新エラー:', err))
        )
      );
      
      setIsPaymentCompleted(true);
      setPaidAmount(paymentAmount);
      setShowPaymentDialog(false);
      setPaymentAmount(0);
      await loadCartOrders(session.id);
      await loadSession();
      await tryAutoPrintReceipts();
    } catch (err) {
      console.error('クレジットカード決済エラー:', err);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error('支払いエラー:', errorMessage);
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
    setPaymentAmount(0);
  };

  const handleCashPaymentConfirm = async () => {
    const amount = parseFloat(cashPaymentAmount);
    if (isNaN(amount) || amount <= 0 || !session) return;

    const totalAmount = calculateTotal();
    if (amount < totalAmount) return;
    
    try {
      // セッションの現在のcostを取得
      const sessionResponse = await fetch(`/api/sessions?id=${session.id}`);
      const sessionResult = await sessionResponse.json();
      const currentCost = sessionResult.success && sessionResult.data?.[0]?.cost ? parseFloat(sessionResult.data[0].cost) : 0;
      const newCost = currentCost + amount;
      
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: newCost, pay_type: 1 })
      });

      // 決済履歴を保存（失敗しても決済フローは継続）
      fetch('/api/session-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, pay_type: 1, amount })
      }).catch(() => {});
      
      // 承認待ちの注文を拒否
      const ordersToReject = cartOrders.filter((order: any) => {
        const st = orderRequestStatus[order.id] || order.status;
        return st === 'pending' || st === 'sent';
      });
      await Promise.all(
        ordersToReject.map((order: any) =>
          fetch(`/api/salesorder/${order.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' })
          }).catch(err => console.error('注文拒否更新エラー:', err))
        )
      );
      
      setIsPaymentCompleted(true);
      setPaidAmount(amount);
      setShowCashPaymentDialog(false);
      setCashPaymentAmount('');
      await loadCartOrders(session.id);
      await loadSession();
      await tryAutoPrintReceipts();
    } catch (err) {
      console.error('現金決済エラー:', err);
    }
  };

  const handleStoreCreditCardPaymentConfirm = async () => {
    if (isProcessingStoreCreditCardPayment) return;
    
    const amount = parseFloat(storeCreditCardPaymentAmount);
    if (isNaN(amount) || amount <= 0 || !session) return;

    const totalAmount = calculateTotal();
    if (amount < totalAmount) return;
    
    setIsProcessingStoreCreditCardPayment(true);
    
    try {
      // セッションの現在のcostを取得
      const sessionResponse = await fetch(`/api/sessions?id=${session.id}`);
      const sessionResult = await sessionResponse.json();
      const currentCost = sessionResult.success && sessionResult.data?.[0]?.cost ? parseFloat(sessionResult.data[0].cost) : 0;
      const newCost = currentCost + amount;
      
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: newCost, pay_type: 0 })
      });

      // 決済履歴を保存（失敗しても決済フローは継続）
      fetch('/api/session-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, pay_type: 0, amount })
      }).catch(() => {});
      
      // 承認待ちの注文を拒否
      const ordersToReject = cartOrders.filter((order: any) => {
        const st = orderRequestStatus[order.id] || order.status;
        return st === 'pending' || st === 'sent';
      });
      await Promise.all(
        ordersToReject.map((order: any) =>
          fetch(`/api/salesorder/${order.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' })
          }).catch(err => console.error('注文拒否更新エラー:', err))
        )
      );
      
      setIsPaymentCompleted(true);
      setPaidAmount(amount);
      setShowStoreCreditCardPaymentDialog(false);
      setStoreCreditCardPaymentAmount('');
      await loadCartOrders(session.id);
      await loadSession();
      await tryAutoPrintReceipts();
    } catch (err) {
      console.error('店舗用クレジットカード決済エラー:', err);
      error('エラー', '決済処理中にエラーが発生しました');
    } finally {
      setIsProcessingStoreCreditCardPayment(false);
    }
  };

  const calculatePaymentAmount = () => {
    const total = calculateTotal();
    return Math.round(total * 1.1);
  };

  // 注文合計を計算（テーブルページと同じロジック）
  const calculateTotal = () => {
    // 手動で設定された合計値がある場合はそれを使用
    const currentManualTotal = getManualTotal();
    if (currentManualTotal !== null) {
      return currentManualTotal;
    }
    
    let subtotal = 0;
    const setPrice = addCharges['set_price'] || 0;
    const extensionUnit = addCharges['extension_price'] || 0;
    
    // 商品の合計（承認済みのみ）
    if (cartOrders && cartOrders.length > 0) {
      const productTotal = cartOrders.reduce((sum, order) => {
        const status = orderRequestStatus[order.id] || order.status;
        if (status === 'accepted') {
          const price = Number(order.total_price);
          const validPrice = isNaN(price) ? 0 : price;
          return sum + validPrice;
        }
        return sum;
      }, 0);
      subtotal += productTotal;
    }
    
    // セッション開始時の料金
    if (guestCount && guestCount.trim() !== '') {
      const initialGuestCount = parseInt(guestCount);
      if (!isNaN(initialGuestCount) && initialGuestCount > 0) {
        subtotal += setPrice * initialGuestCount;
      }
    }
    
    // セット延長料金
    setExtensions.forEach(extension => {
      if (extension.count > 0) {
        const ext = Number(extension.price ?? (extensionUnit * extension.count));
        subtotal += Number.isFinite(ext) ? ext : 0;
      }
    });
    
    // 指名料金の合計
    subtotal += calculateNominationCharges();
    
    // 追加サービス料金の合計
    additionalServices.forEach(service => {
      subtotal += service.charge;
    });
    
    // サービス手数料（10%）
    const serviceFee = Math.round(subtotal * 0.1);
    
    // 合計 = 小計 + サービス手数料
    return subtotal + serviceFee;
  };

  // 合計値の編集を開始
  const handleStartEditTotal = () => {
    if (!ensureSuperAdminForTotalEdit()) return;
    const currentTotal = calculateTotal();
    setEditingTotalValue(currentTotal.toString());
    setIsEditingTotal(true);
  };

  // 合計値の編集を保存
  const handleSaveTotal = () => {
    if (!ensureSuperAdminForTotalEdit()) return;
    const value = parseFloat(editingTotalValue);
    if (isNaN(value) || value < 0) {
      error('エラー', '有効な金額を入力してください');
      return;
    }
    setManualTotal(value);
    setIsEditingTotal(false);
    success('合計値更新', `合計値を${formatCurrency(value)}に設定しました`);
  };

  // 合計値の編集をキャンセル
  const handleCancelEditTotal = () => {
    if (!ensureSuperAdminForTotalEdit()) return;
    setIsEditingTotal(false);
    setEditingTotalValue('');
  };

  // 合計値を自動計算に戻す
  const handleResetTotal = () => {
    if (!ensureSuperAdminForTotalEdit()) return;
    setManualTotal(null);
    success('合計値リセット', '合計値を自動計算に戻しました');
  };

  // 自動計算された合計値を取得（手動設定値の表示用）
  const getAutoCalculatedTotal = () => {
    let subtotal = 0;
    const setPrice = addCharges['set_price'] || 0;
    const extensionUnit = addCharges['extension_price'] || 0;
    
    // 商品の合計（承認済みのみ）
    if (cartOrders && cartOrders.length > 0) {
      const productTotal = cartOrders.reduce((sum, order) => {
        const status = orderRequestStatus[order.id] || order.status;
        if (status === 'accepted') {
          const price = Number(order.total_price);
          const validPrice = isNaN(price) ? 0 : price;
          return sum + validPrice;
        }
        return sum;
      }, 0);
      subtotal += productTotal;
    }
    
    // セッション開始時の料金
    if (guestCount && guestCount.trim() !== '') {
      const initialGuestCount = parseInt(guestCount);
      if (!isNaN(initialGuestCount) && initialGuestCount > 0) {
        subtotal += setPrice * initialGuestCount;
      }
    }
    
    // セット延長料金
    setExtensions.forEach(extension => {
      if (extension.count > 0) {
        const ext = Number(extension.price ?? (extensionUnit * extension.count));
        subtotal += Number.isFinite(ext) ? ext : 0;
      }
    });
    
    // 指名料金の合計
    subtotal += calculateNominationCharges();
    
    // 追加サービス料金の合計
    additionalServices.forEach(service => {
      subtotal += service.charge;
    });
    
    // サービス手数料（10%）
    const serviceFee = Math.round(subtotal * 0.1);
    
    // 合計 = 小計 + サービス手数料
    return subtotal + serviceFee;
  };

  const nominationBadgeStyle: Record<'main' | 'inside' | 'together', string> = {
    main: 'bg-purple-50 text-purple-700 border-purple-200',
    inside: 'bg-blue-50 text-blue-700 border-blue-200',
    together: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">テーブル {tableId} - 管理者ビュー</h2>
            <p className="text-sm text-blue-100">セッション情報と注文状況を表示</p>
          </div>
          <div className="flex items-center space-x-2">
            {session && (
              <Button
                variant="outline"
                size="sm"
                onClick={endSession}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                セッション終了
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-12 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !session ? (
            <div className="text-center py-12 text-gray-500">
              <p>このテーブルにはアクティブなセッションがありません</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 左側: タブコンテンツ（注文・指名・サービス） */}
              <div className="lg:col-span-2 space-y-4">
                {/* タブ */}
                <Tabs value={leftMode} onValueChange={(value) => setLeftMode(value as 'order' | 'nomination' | 'service')}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="order">注文</TabsTrigger>
                    <TabsTrigger value="nomination">指名</TabsTrigger>
                    <TabsTrigger value="service">サービス</TabsTrigger>
                  </TabsList>

                  {/* 注文タブ */}
                  <TabsContent value="order" className="space-y-4 mt-4">
                    <div className={isTimeExpired ? 'pointer-events-none opacity-50' : ''}>
                      {/* カテゴリタブ（スクロール時に固定 / 連続した平行四辺形） */}
                      <div className="sticky top-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pt-2 pb-2 z-30 mb-4">
                        <div className="pl-2 sm:pl-5 flex items-center overflow-x-auto">
                          {[
                            { id: 'all', name: 'すべて' },
                            { id: '4', name: 'セット' },
                            ...menuCategories.filter((c) => c.id !== 4).map((c) => ({ id: String(c.id), name: c.name })),
                          ].map((tab, idx) => {
                            const active = selectedCategoryId === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSelectedCategoryId(tab.id)}
                                className={[
                                  'relative h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm font-semibold select-none whitespace-nowrap',
                                  'skew-x-12',
                                  idx === 0 ? '' : '-ml-2 sm:-ml-3',
                                  active
                                    ? 'bg-purple-600 text-white shadow-md z-20'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 z-10',
                                  'rounded-none',
                                ].join(' ')}
                              >
                                <span className="inline-block -skew-x-12">
                                  {tab.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <ScrollArea className="h-[calc(100vh-300px)] pr-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                          {(() => {
                            const items = selectedCategoryId === 'all'
                              ? menuItems
                              : selectedCategoryId === '4'
                              ? menuItems.filter((it: any) => Number(it.category_id) === 4)
                              : menuItems.filter((it: any) => Number(it.category_id) === Number(selectedCategoryId));
                            if (!items || items.length === 0) {
                              return (
                                <div className="col-span-2 sm:col-span-3 lg:col-span-4 text-center text-sm text-gray-500 py-10">
                                  該当する商品がありません
                                </div>
                              );
                            }
                            return items.map((item: any) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => { if (!isOrderingDisabled && !isTimeExpired) addToCart(item); }}
                                className={`text-left rounded-lg border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isOrderingDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                                disabled={isOrderingDisabled}
                              >
                                <div className="relative aspect-square bg-gray-100">
                                  {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <Package className="w-8 h-8" />
                                    </div>
                                  )}
                                  <div className="absolute right-1 bottom-1 bg-black/70 text-white text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                    {formatCurrency(item.sale_price)}
                                  </div>
                                </div>
                                <div className="p-1 sm:p-1.5">
                                  <div className="text-[11px] sm:text-[13px] font-semibold leading-tight line-clamp-2">{item.name}</div>
                                  <div className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1">
                                    SKU: {item.sku ? item.sku : '-'}
                                  </div>
                                </div>
                              </button>
                            ));
                          })()}
                        </div>
                      </ScrollArea>

                      {/* 左下：注文カートボタン（押すと横からモーダル表示） */}
                      <div className="fixed left-2 sm:left-16 bottom-[100px] sm:bottom-[100px] z-40">
                        {(() => {
                          const hasRequested = cartOrders.some((order: any) => {
                            const st = (orderRequestStatus as any)[order.id] || order.status;
                            return st === 'pending' || st === 'sent';
                          });
                          return (
                            <Button
                              onClick={() => setIsOrderCartOpen(true)}
                              className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-lg hover:from-pink-600 hover:to-fuchsia-600 relative border-0"
                              variant="outline"
                            >
                              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />

                              {hasRequested && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full ring-2 ring-white" />
                              )}
                            </Button>
                          );
                        })()}
                      </div>

                      <Sheet open={isOrderCartOpen} onOpenChange={setIsOrderCartOpen}>
                        <SheetContent side="right" className="w-full sm:w-[420px] sm:max-w-md p-0">
                          <div className="p-6 pb-4 border-b">
                            <SheetHeader>
                              <SheetTitle className="flex items-center">
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                注文カート
                              </SheetTitle>
                            </SheetHeader>
                            <div className="text-sm text-gray-500 mt-1">
                              {cartOrders.length}個の商品
                            </div>
                          </div>

                          <div className="p-6 pt-4">
                            {cartOrders.length === 0 ? (
                              <div className="text-center py-10 text-gray-500">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p>カートが空です</p>
                              </div>
                            ) : (
                              <ScrollArea className="h-[60vh] sm:h-[70vh] pr-1">
                                <div className="space-y-3">
                                  {cartOrders.map((order: any) => (
                                    <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border gap-2 sm:gap-0">
                                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <h4 className="font-medium text-xs sm:text-sm truncate">{order.product_name}</h4>
                                        <p className="text-[10px] sm:text-xs text-gray-500">
                                          ¥{order.unit_price?.toLocaleString()} × {order.amount}個
                                          {order.cast_name ? (
                                            <span className="ml-1 sm:ml-2 text-blue-600">(担当: {order.cast_name})</span>
                                          ) : (
                                            <span className="ml-1 sm:ml-2 text-gray-500">(お客様直接注文)</span>
                                          )}
                                        </p>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center mt-1 gap-1 sm:gap-0">
                                          <span className="text-xs sm:text-sm font-bold text-blue-600">
                                            合計: ¥{order.total_price?.toLocaleString()}
                                          </span>
                                          {orderRequestStatus[order.id] === 'sent' && (
                                            <span className="text-[9px] sm:text-xs text-blue-600 font-medium">
                                              (管理者に送信済み)
                                            </span>
                                          )}
                                          {orderRequestStatus[order.id] === 'accepted' && (
                                            <span className="text-[9px] sm:text-xs text-green-600 font-medium">
                                              (管理者が受付済み)
                                            </span>
                                          )}
                                          {(orderRequestStatus[order.id] as string) === 'rejected' && (
                                            <span className="text-[9px] sm:text-xs text-red-600 font-medium">
                                              (管理者が拒否)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto justify-end">
                                        <div className="relative">
                                          {orderRequestStatus[order.id] === 'pending' && (
                                            <div className="w-6 h-6 flex items-center justify-center">
                                              <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
                                            </div>
                                          )}
                                          {orderRequestStatus[order.id] === 'sent' && (
                                            <div className="w-6 h-6 flex items-center justify-center">
                                              <Bell className="w-4 h-4 text-blue-500 animate-bounce" />
                                            </div>
                                          )}
                                          {orderRequestStatus[order.id] === 'accepted' && (
                                            <div className="w-6 h-6 flex items-center justify-center">
                                              <CheckCircle className="w-4 h-4 text-green-500" />
                                            </div>
                                          )}
                                          {(orderRequestStatus[order.id] as string) === 'rejected' && (
                                            <div className="w-6 h-6 flex items-center justify-center">
                                              <X className="w-4 h-4 text-red-500" />
                                            </div>
                                          )}
                                        </div>
                                        {(() => {
                                          const st = (orderRequestStatus as any)[order.id] || order.status;
                                          const canDelete = st === 'pending' || st === 'sent';
                                          return canDelete ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => removeFromCart(order.id.toString(), st)}
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          ) : null;
                                        })()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </TabsContent>

                  {/* 指名タブ */}
                  <TabsContent value="nomination" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 xl:gap-12">
                      {/* 指名ボタンエリア */}
                      <div className="col-span-1 md:col-span-1 lg:col-span-1 space-y-4 md:space-y-6 lg:space-y-8 md:pr-4 lg:pr-0">
                        <Button
                          size="lg"
                          className="w-full h-32 sm:h-36 md:h-40 lg:h-44 xl:h-48 text-base sm:text-lg md:text-xl lg:text-2xl bg-purple-600 hover:bg-purple-700 relative overflow-hidden p-0 shadow-lg hover:shadow-xl transition-shadow"
                          disabled={isOrderingDisabled}
                          onClick={() => {
                            setCurrentNominationType('main');
                            loadCasts();
                            setShowNominationCastDialog(true);
                          }}
                        >
                          <div className="absolute inset-0">
                            <img
                              src="/assets/nomination/1.jpeg"
                              alt="本指名"
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/25" />
                          </div>
                          <div className="relative z-10 w-full h-full flex items-center justify-center font-bold tracking-wide text-white drop-shadow-lg">
                            本 指 名
                          </div>
                        </Button>
                        <Button
                          size="lg"
                          className="w-full h-32 sm:h-36 md:h-40 lg:h-44 xl:h-48 text-base sm:text-lg md:text-xl lg:text-2xl bg-blue-600 hover:bg-blue-700 relative overflow-hidden p-0 shadow-lg hover:shadow-xl transition-shadow"
                          disabled={isOrderingDisabled}
                          onClick={() => {
                            setCurrentNominationType('inside');
                            loadCasts();
                            setShowNominationCastDialog(true);
                          }}
                        >
                          <div className="absolute inset-0">
                            <img
                              src="/assets/nomination/2.jpeg"
                              alt="場内指名"
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/25" />
                          </div>
                          <div className="relative z-10 w-full h-full flex items-center justify-center font-bold tracking-wide text-white drop-shadow-lg">
                            場 内 指 名
                          </div>
                        </Button>
                        <Button
                          size="lg"
                          className="w-full h-32 sm:h-36 md:h-40 lg:h-44 xl:h-48 text-base sm:text-lg md:text-xl lg:text-2xl bg-rose-600 hover:bg-rose-700 relative overflow-hidden p-0 shadow-lg hover:shadow-xl transition-shadow"
                          disabled={isOrderingDisabled}
                          onClick={() => {
                            setCurrentNominationType('together');
                            loadCasts();
                            setShowNominationCastDialog(true);
                          }}
                        >
                          <div className="absolute inset-0">
                            <img
                              src="/assets/nomination/3.jpeg"
                              alt="同伴指名"
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/25" />
                          </div>
                          <div className="relative z-10 w-full h-full flex items-center justify-center font-bold tracking-wide text-white drop-shadow-lg">
                            同 伴 指 名
                          </div>
                        </Button>
                      </div>
                      {/* 指名リストエリア */}
                      <div className="col-span-1 md:col-span-1 lg:col-span-2">
                        <Card className="h-full">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2" />
                              指名リスト
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {isNominationsLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : nominations.length === 0 ? (
                              <div className="text-center py-8 text-sm sm:text-base text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                <p>指名はありません</p>
                              </div>
                            ) : (
                              <ScrollArea className="h-[calc(100vh-400px)] pr-2">
                                <div className="space-y-2 sm:space-y-3">
                                  {nominations.map((nomination: any) => (
                                    <div
                                      key={nomination.id}
                                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-gray-200 rounded-lg bg-white px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 gap-2 sm:gap-3 hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <div className="font-medium text-sm sm:text-base md:text-lg text-gray-900 truncate mb-1">
                                          {nomination.cast_name}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-500">
                                          {new Date(nomination.created_at).toLocaleString('ja-JP', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end sm:justify-start">
                                        <Badge
                                          className={`text-xs sm:text-sm px-2 sm:px-3 py-1 ${nominationBadgeStyle[nomination.type_id as 'main' | 'inside' | 'together'] || 'bg-gray-100 text-gray-700'}`}
                                        >
                                          {getNominationTypeLabel(nomination.type_id)}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 border-red-300 hover:bg-red-50 h-8 sm:h-9 w-8 sm:w-9 p-0"
                                          onClick={() => deleteNominationRecord(nomination.id.toString())}
                                        >
                                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  {/* サービスタブ */}
                  <TabsContent value="service" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="col-span-1 lg:col-span-2 space-y-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-xs sm:text-sm">
                              <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              サービス・呼び出し
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {isServicesLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : services.length === 0 ? (
                              <div className="text-center py-4 text-sm text-gray-500">
                                サービスがありません
                              </div>
                            ) : (
                              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${isTimeExpired ? 'pointer-events-none opacity-50' : ''}`}>
                                {services.map((service: any) => (
                                  <Button
                                    key={service.id}
                                    variant="outline"
                                    onClick={() => handleServiceOrder(service)}
                                    disabled={isOrderingDisabled}
                                    className={`h-12 sm:h-14 px-1 sm:px-2 flex-col justify-center gap-0.5 sm:gap-1 ${isOrderingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="text-[10px] sm:text-[13px] leading-tight line-clamp-1">{service.name}</span>
                                  </Button>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-xs sm:text-sm">
                              <Coffee className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              追加注文
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`grid grid-cols-3 gap-2 ${isTimeExpired ? 'pointer-events-none opacity-50' : ''}`}>
                              <Button
                                variant="outline"
                                onClick={() => setShowBottleKeepDialog(true)}
                                disabled={isTimeExpired}
                                className="h-12 sm:h-14 px-1 sm:px-2 flex-col justify-center gap-0.5 sm:gap-1"
                              >
                                <Wine className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="text-[10px] sm:text-[13px] leading-tight">ボトルキープ</span>
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowVipRoomDialog(true)}
                                disabled={isTimeExpired}
                                className="h-14 px-2 flex-col justify-center gap-1"
                              >
                                <Users className="w-5 h-5" />
                                <span className="text-[10px] sm:text-[13px] leading-tight">VIPルーム</span>
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowKaraokeDialog(true)}
                                disabled={isTimeExpired}
                                className="h-14 px-2 flex-col justify-center gap-1"
                              >
                                <Users className="w-5 h-5" />
                                <span className="text-[10px] sm:text-[13px] leading-tight">カラオケ利用</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* 右側：サービス注文カート */}
                      <div className="col-span-1">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Utensils className="w-5 h-5 mr-2" />
                              サービス注文カート
                            </CardTitle>
                            <CardDescription>
                              {serviceOrders.length}個のサービス
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {serviceOrders.length === 0 ? (
                              <div className="text-center py-6 text-gray-500">
                                <Utensils className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                                <p>サービス注文がありません</p>
                              </div>
                            ) : (
                              <ScrollArea className="h-[45vh] sm:h-[55vh] pr-1">
                                <div className="space-y-3">
                                  {serviceOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                      <div className="flex-1">
                                        <h4 className="font-medium text-sm">{order.service_name}</h4>
                                        <p className="text-xs text-gray-500">
                                          数量: {order.amount}
                                          {order.cast_name && (
                                            <span className="ml-2 text-blue-600">
                                              (担当: {order.cast_name})
                                            </span>
                                          )}
                                        </p>
                                        <div className="flex items-center mt-1">
                                          {serviceRequestStatus[order.id] === 'sent' && (
                                            <span className="text-xs text-blue-600 font-medium">
                                              (管理者に送信済み)
                                            </span>
                                          )}
                                          {serviceRequestStatus[order.id] === 'accepted' && (
                                            <span className="text-xs text-green-600 font-medium">
                                              (管理者が受付済み)
                                            </span>
                                          )}
                                          {(serviceRequestStatus[order.id] as string) === 'rejected' && (
                                            <span className="text-xs text-red-600 font-medium">
                                              (管理者が拒否)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {serviceRequestStatus[order.id] === 'pending' && (
                                          <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
                                        )}
                                        {serviceRequestStatus[order.id] === 'sent' && (
                                          <Bell className="w-4 h-4 text-blue-500 animate-bounce" />
                                        )}
                                        {serviceRequestStatus[order.id] === 'accepted' && (
                                          <CheckCircle className="w-4 h-4 text-green-500" />
                                        )}
                                        {(serviceRequestStatus[order.id] as string) === 'rejected' && (
                                          <X className="w-4 h-4 text-red-500" />
                                        )}
                                        <Button 
                                          size="sm"
                                          variant="outline"
                                          onClick={() => removeFromServiceOrders(order.id.toString())}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* 右側: セット延長と注文合計（常に表示） */}
              <div className="space-y-6">
                {/* セット延長 */}
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-sm font-semibold text-purple-800">
                      <Clock className="w-4 h-4 mr-2" />
                      セット延長
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-x-2 flex">
                    <div className="w-1/2 bg-white rounded-md p-3 border border-purple-200 text-center">
                      <div className="text-[11px] text-gray-500 mb-1">残り時間</div>
                      {session?.is_paused && isEditingRemainingTime ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="999"
                              value={editingRemainingMinutes}
                              onChange={(e) => setEditingRemainingMinutes(e.target.value)}
                              className="w-16 h-8 text-center text-lg font-bold"
                              placeholder="分"
                            />
                            <span className="text-2xl font-bold">:</span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              value={editingRemainingSeconds}
                              onChange={(e) => setEditingRemainingSeconds(e.target.value)}
                              className="w-16 h-8 text-center text-lg font-bold"
                              placeholder="秒"
                            />
                          </div>
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              onClick={handleChangeRemainingTime}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {/* 変更 */}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingRemainingTime(false);
                                setEditingRemainingMinutes('');
                                setEditingRemainingSeconds('');
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              {/* キャンセル */}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`text-2xl font-bold leading-none ${session?.is_paused ? 'text-gray-400' : 'text-purple-600'}`}>
                            {Math.floor(setExtensionCountdown / 60)}:{(setExtensionCountdown % 60).toString().padStart(2, '0')}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {Math.floor(setExtensionCountdown / 60)}分 {setExtensionCountdown % 60}秒
                          </div>
                          {session?.is_paused && (
                            <>
                              <div className="text-xs text-orange-600 mt-1 font-semibold">停止中</div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsEditingRemainingTime(true);
                                  setEditingRemainingMinutes(Math.floor(setExtensionCountdown / 60).toString());
                                  setEditingRemainingSeconds((setExtensionCountdown % 60).toString());
                                }}
                                className="mt-2 text-xs"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                {/* 残り時間変更 */}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <div className="w-1/2 flex flex-col space-y-2">
                      <div className="text-sm text-gray-700">
                        <div>セット数: {session.set_count}</div>
                        <div>人数: {session.client}名</div>
                      </div>
                      <Button
                        onClick={handleSetExtension}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold">セット延長</span>
                      </Button>
                      <Button
                        onClick={handleCancelSet}
                        size="sm"
                        disabled={setExtensionCountdown < 3600 || setExtensions.length === 0}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold">1セットキャンセル</span>
                      </Button>
                      <Button
                        onClick={handlePauseResume}
                        size="sm"
                        variant={session?.is_paused ? "default" : "outline"}
                        className={session?.is_paused ? "flex-1 bg-green-600 hover:bg-green-700 text-white" : "flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"}
                      >
                        {session?.is_paused ? (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold">再開</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold">停止</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>


                {/* 注文合計 */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      注文合計
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintReceipt}
                        className="h-8 gap-1"
                      >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">領収書印刷</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShowReceiptPreview}
                        className="h-8 px-2"
                        title="プレビュー"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 承認状況の表示 */}
                    <div className="bg-blue-50 rounded-lg p-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-blue-700">承認済み商品:</span>
                          <span className="font-medium text-blue-900">
                            {cartOrders.filter(order => {
                              const status = orderRequestStatus[order.id] || order.status;
                              return status === 'accepted';
                            }).length}件
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">承認待ち商品:</span>
                          <span className="font-medium text-orange-600">
                            {cartOrders.filter(order => {
                              const status = orderRequestStatus[order.id] || order.status;
                              return status === 'pending' || status === 'sent';
                            }).length}件
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* 商品合計 */}
                      {(() => {
                        const productTotal = cartOrders.reduce((sum, order) => {
                          const status = orderRequestStatus[order.id] || order.status;
                          if (status === 'accepted') {
                            return sum + (Number(order.total_price) || 0);
                          }
                          return sum;
                        }, 0);
                        if (productTotal > 0) {
                          return (
                            <div className="flex justify-between text-sm">
                              <span>商品合計</span>
                              <span>{formatCurrency(productTotal)}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* セッション料金 */}
                      {guestCount && (
                        <div className="flex justify-between text-sm">
                          <span>セッション料金 ({guestCount}名)</span>
                          <span>{formatCurrency((addCharges['set_price'] || 0) * parseInt(guestCount || '0'))}</span>
                        </div>
                      )}

                      {/* セット延長料金 */}
                      {setExtensions.map((extension, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>セット延長 ({extension.count}名)</span>
                          <span>{formatCurrency(Number(extension.price ?? ((addCharges['extension_price'] || 0) * extension.count)) || 0)}</span>
                        </div>
                      ))}

                      {/* 指名料金の明細 */}
                      {nominations.length > 0 && (
                        <div className="border-t pt-2 space-y-1">
                          <div className="text-xs font-semibold text-gray-600 mb-1">指名料金</div>
                          {nominations.map((nomination) => {
                            let chargeLabel = '';
                            
                            if (nomination.type_id === 'together') {
                              chargeLabel = `${getNominationTypeLabel(nomination.type_id)} - ${nomination.cast_name}`;
                            } else if (nomination.type_id === 'main') {
                              chargeLabel = `${getNominationTypeLabel(nomination.type_id)} - ${nomination.cast_name}`;
                            } else if (nomination.type_id === 'inside') {
                              const promoted = Number((nomination as any).tomain_nomination) === 1;
                              chargeLabel = `${getNominationTypeLabel(nomination.type_id)}${promoted ? '（本指名へ昇格）' : ''} - ${nomination.cast_name}`;
                            }
                            
                            return (
                              <div key={nomination.id} className="flex justify-between text-sm pl-3">
                                <span className="text-gray-700">{chargeLabel}</span>
                                <span>{formatCurrency(Number((nomination as any).cost) || 0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* 追加サービス料金の明細 */}
                      {additionalServices.length > 0 && (
                        <div className="border-t pt-2 space-y-1">
                          <div className="text-xs font-semibold text-gray-600 mb-1">追加サービス</div>
                          {additionalServices.map((service, index) => {
                            let serviceLabel = '';
                            if (service.type === 'bottle_keep') {
                              serviceLabel = 'ボトルキープ';
                            } else if (service.type === 'vip_room') {
                              serviceLabel = `VIPルーム利用 (${service.count}部屋)`;
                            } else if (service.type === 'karaoke') {
                              serviceLabel = `カラオケ利用 (${service.count}曲)`;
                            }
                            
                            return (
                              <div key={index} className="flex justify-between text-sm pl-3">
                                <span className="text-gray-700">{serviceLabel}</span>
                                <span>{formatCurrency(service.charge)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* 小計とサービス手数料 */}
                      {(() => {
                        let subtotal = 0;
                        
                        // 商品の合計
                        if (cartOrders && cartOrders.length > 0) {
                          const productTotal = cartOrders.reduce((sum, order) => {
                            const status = orderRequestStatus[order.id] || order.status;
                            if (status === 'accepted') {
                              const price = Number(order.total_price);
                              const validPrice = isNaN(price) ? 0 : price;
                              return sum + validPrice;
                            }
                            return sum;
                          }, 0);
                          subtotal += productTotal;
                        }
                        
                        const setPrice = addCharges['set_price'] || 0;
                        const extensionUnit = addCharges['extension_price'] || 0;

                        // セッション開始時の料金
                        if (guestCount && guestCount.trim() !== '') {
                          const initialGuestCount = parseInt(guestCount);
                          if (!isNaN(initialGuestCount) && initialGuestCount > 0) {
                            subtotal += setPrice * initialGuestCount;
                          }
                        }
                        
                        // セット延長料金
                        setExtensions.forEach(extension => {
                          if (extension.count > 0) {
                            const ext = Number(extension.price ?? (extensionUnit * extension.count));
                            subtotal += Number.isFinite(ext) ? ext : 0;
                          }
                        });
                        
                        // 指名料金の合計
                        subtotal += calculateNominationCharges();
                        
                        // 追加サービス料金の合計
                        additionalServices.forEach(service => {
                          subtotal += service.charge;
                        });
                        
                        const serviceFee = Math.round(subtotal * 0.1);
                        
                        if (subtotal > 0) {
                          return (
                            <>
                              <div className="border-t pt-2 flex justify-between text-sm">
                                <span>小計</span>
                                <span>{formatCurrency(subtotal)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>サービス手数料 (10%)</span>
                                <span>{formatCurrency(serviceFee)}</span>
                              </div>
                            </>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* 合計 */}
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center font-bold text-lg mb-2">
                          <span>合計</span>
                          <div className="flex items-center space-x-2">
                            {isEditingTotal ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  value={editingTotalValue}
                                  onChange={(e) => setEditingTotalValue(e.target.value)}
                                  className="w-32 text-right font-bold"
                                  min="0"
                                  step="1"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleSaveTotal}
                                  className="h-8 w-8 p-0"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditTotal}
                                  className="h-8 w-8 p-0"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className={`text-blue-600 ${getManualTotal() !== null ? 'underline decoration-dotted' : ''}`}>
                                  {formatCurrency(calculateTotal())}
                                </span>
                                {getManualTotal() !== null && (
                                  <span className="text-xs text-gray-500 font-normal">
                                    (手動設定)
                                  </span>
                                )}
                                {isSuperAdmin && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleStartEditTotal}
                                      className="h-8 w-8 p-0"
                                      title="合計値を編集"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    {getManualTotal() !== null && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleResetTotal}
                                        className="h-8 w-8 p-0 text-xs"
                                        title="自動計算に戻す"
                                      >
                                        リセット
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {getManualTotal() !== null && (
                          <div className="text-xs text-gray-500 mt-1">
                            自動計算値: {formatCurrency(getAutoCalculatedTotal())}
                          </div>
                        )}
                      </div>
                      
                      {/* 決済ボタンまたは決済成功表示 */}
                      {isPaymentCompleted ? (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="font-bold text-lg text-green-700 mb-1">決済成功</div>
                          <div className="text-sm text-green-600 mb-2">支払いが完了しました</div>
                          <div className="text-lg font-bold text-green-700">
                            {formatCurrency(paidAmount)}
                          </div>
                        </div>
                      ) : (
                        <Button 
                          onClick={handlePayment}
                          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          size="lg"
                          disabled={calculateTotal() <= 0 || isNaN(calculateTotal())}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          決済
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-2 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            管理者モード - テーブル操作中
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-700"
          >
            閉じる
          </Button>
        </div>
      </div>

      {/* セット延長ダイアログ */}
      <Dialog open={showSetExtensionDialog} onOpenChange={setShowSetExtensionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              セット延長
            </DialogTitle>
            <DialogDescription>
              延長する人数を入力してください。延長後、60分のカウントダウンが再開されます。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extension-guest-count">延長時の人数</Label>
              <Input
                id="extension-guest-count"
                type="number"
                min="1"
                placeholder="人数を入力してください"
                value={extensionGuestCount}
                onChange={(e) => setExtensionGuestCount(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                延長料金: {extensionGuestCount && !isNaN(parseInt(extensionGuestCount)) && parseInt(extensionGuestCount) > 0 
                  ? formatCurrency((addCharges['extension_price'] || 0) * parseInt(extensionGuestCount))
                  : formatCurrency(0)}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowSetExtensionDialog(false);
                setExtensionGuestCount('');
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={confirmSetExtension}
              disabled={!extensionGuestCount || extensionGuestCount.trim() === '' || isNaN(parseInt(extensionGuestCount)) || parseInt(extensionGuestCount) <= 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              延長確定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* キャスト選択ダイアログ（同伴指名用） */}
      <Dialog open={showCastSelectionDialog} onOpenChange={setShowCastSelectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              同伴指名 - キャスト選択
            </DialogTitle>
            <DialogDescription>
              同伴指名するキャストを選択してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isCastsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : casts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                キャストがありません
              </div>
            ) : (
              <ScrollArea className="h-[40vh]">
                <div className="space-y-2">
                  {casts.map((cast) => (
                    <Button
                      key={cast.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => submitTogetherNomination(cast.id.toString(), cast.name)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {cast.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 決済方法選択ダイアログ */}
      <Dialog open={showPaymentMethodDialog} onOpenChange={setShowPaymentMethodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              決済方法を選択
            </DialogTitle>
            <DialogDescription>
              支払い方法を選択してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button
              onClick={handleCreditCardPayment}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              クレジットカードで決済 ({formatCurrency(calculatePaymentAmount())})
            </Button>
            
            <Button
              onClick={handleCashPayment}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="lg"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              現金で決済 ({formatCurrency(calculateTotal())})
            </Button>
            
            <Button
              onClick={handleStoreCreditCardPayment}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              店舗用クレジットカード決済 
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 現金決済ダイアログ */}
      <Dialog open={showCashPaymentDialog} onOpenChange={setShowCashPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              現金決済
            </DialogTitle>
            <DialogDescription>
              決済金額を入力してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cash-amount">決済金額</Label>
              <Input
                id="cash-amount"
                type="number"
                min={calculateTotal()}
                placeholder="金額を入力"
                value={cashPaymentAmount}
                onChange={(e) => setCashPaymentAmount(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                合計金額: {formatCurrency(calculateTotal())}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCashPaymentDialog(false);
                  setCashPaymentAmount('');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCashPaymentConfirm}
                disabled={!cashPaymentAmount || parseFloat(cashPaymentAmount) < calculateTotal()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                確認
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 店舗用クレジットカード決済ダイアログ */}
      <Dialog open={showStoreCreditCardPaymentDialog} onOpenChange={setShowStoreCreditCardPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              店舗用クレジットカード決済
            </DialogTitle>
            <DialogDescription>
              決済金額を入力してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-credit-card-amount">決済金額</Label>
              <Input
                id="store-credit-card-amount"
                type="number"
                min={calculateTotal()}
                placeholder="金額を入力"
                value={storeCreditCardPaymentAmount}
                onChange={(e) => setStoreCreditCardPaymentAmount(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                合計金額: {formatCurrency(calculateTotal())}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStoreCreditCardPaymentDialog(false);
                  setStoreCreditCardPaymentAmount('');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleStoreCreditCardPaymentConfirm}
                disabled={isProcessingStoreCreditCardPayment || !storeCreditCardPaymentAmount || parseFloat(storeCreditCardPaymentAmount) < calculateTotal()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isProcessingStoreCreditCardPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    処理中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    確認
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* クレジットカード決済ダイアログ */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              クレジットカード決済
            </DialogTitle>
            <DialogDescription>
              支払い金額: {formatCurrency(paymentAmount)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <StripeProvider>
              <StripePaymentForm
                amount={paymentAmount}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handlePaymentCancel}
              />
            </StripeProvider>
          </div>
        </DialogContent>
      </Dialog>

      {/* 注文ダイアログ */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              商品注文
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}の注文詳細を入力してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 商品情報 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{selectedProduct?.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {selectedProduct?.sku || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    ¥{selectedProduct?.sale_price?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-gray-500">在庫: {selectedProduct?.amount || 0}個</p>
                </div>
              </div>
            </div>

            {/* キャスト用として注文 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="for-cast"
                checked={isForCast}
                onChange={(e) => {
                  setIsForCast(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedCastForOrder('none');
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="for-cast" className="cursor-pointer">
                キャスト用として注文
              </Label>
            </div>

            {/* キャスト選択 */}
            <div className="space-y-2">
              <Label htmlFor="cast-select" className={!isForCast ? 'text-gray-400' : ''}>
                担当キャスト（任意）
              </Label>
              <Select 
                value={selectedCastForOrder} 
                onValueChange={setSelectedCastForOrder}
                disabled={!isForCast}
              >
                <SelectTrigger className={!isForCast ? 'opacity-50 cursor-not-allowed' : ''}>
                  <SelectValue placeholder="キャストを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">キャストなし</SelectItem>
                  {isCastsLoading ? (
                    <SelectItem value="loading" disabled>
                      読み込み中...
                    </SelectItem>
                  ) : (
                    casts.map((cast) => (
                      <SelectItem key={cast.id} value={cast.id.toString()}>
                        {cast.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!isForCast && (
                <p className="text-xs text-gray-500">
                  「キャスト用として注文」をチェックすると選択可能になります
                </p>
              )}
            </div>

            {/* 注文数量 */}
            <div className="space-y-2">
              <Label htmlFor="quantity">注文数量</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                  disabled={orderQuantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct?.amount || 999}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderQuantity(Math.min(selectedProduct?.amount || 999, orderQuantity + 1))}
                  disabled={orderQuantity >= (selectedProduct?.amount || 999)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                最大: {selectedProduct?.amount || 0}個
              </p>
            </div>

            {/* 合計金額 */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">合計金額:</span>
                <span className="text-xl font-bold text-blue-600">
                  ¥{((selectedProduct?.sale_price || 0) * orderQuantity).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowOrderDialog(false);
                setSelectedProduct(null);
                setOrderQuantity(1);
                setSelectedCastForOrder('none');
                setIsForCast(false);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleOrderSubmit}
              disabled={isOrderingDisabled || !selectedProduct || orderQuantity < 1}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              注文確定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 指名キャスト選択ダイアログ */}
      <Dialog open={showNominationCastDialog} onOpenChange={setShowNominationCastDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              {currentNominationType === 'main' ? '本指名' : currentNominationType === 'inside' ? '場内指名' : currentNominationType === 'together' ? '同伴指名' : '指名'}登録
            </DialogTitle>
            <DialogDescription>
              指名するキャストを選択してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isCastsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {casts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>出勤中のキャストがありません</p>
                    </div>
                  ) : (
                    casts.map((cast) => (
                      <Button
                        key={cast.id}
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleNomination(cast.id.toString(), cast.name, currentNominationType || 'main')}
                      >
                        <div className="flex items-center space-x-3">
                          <Users className="w-5 h-5 text-purple-600" />
                          <div className="text-left">
                            <div className="font-medium">{cast.name}</div>
                            <div className="text-xs text-gray-500">ID: {cast.id}</div>
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowNominationCastDialog(false);
                setCurrentNominationType(null);
              }}
            >
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* サービス注文ダイアログ */}
      <Dialog open={showServiceOrderDialog} onOpenChange={setShowServiceOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Utensils className="w-5 h-5 mr-2" />
              サービス注文
            </DialogTitle>
            <DialogDescription>
              {selectedService?.name}の注文詳細を入力してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* サービス情報 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{selectedService?.name}</h3>
                </div>
              </div>
            </div>

            {/* 注文数量 */}
            <div className="space-y-2">
              <Label htmlFor="service-quantity">注文数量</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setServiceOrderQuantity(Math.max(1, serviceOrderQuantity - 1))}
                  disabled={serviceOrderQuantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  id="service-quantity"
                  type="number"
                  min="1"
                  value={serviceOrderQuantity}
                  onChange={(e) => setServiceOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setServiceOrderQuantity(serviceOrderQuantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowServiceOrderDialog(false);
                setSelectedService(null);
                setServiceOrderQuantity(1);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={async () => {
                if (!session || !selectedService || !tableId) return;
                if (isOrderingDisabled) {
                  error('エラー', isPaymentCompleted ? '決済が完了しているため、サービスを注文できません' : 'セット時間が終了したため、サービスを注文できません');
                  return;
                }

                try {
                  const response = await fetch('/api/serviceorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      service_id: selectedService.id,
                      amount: serviceOrderQuantity,
                      table_id: tableId,
                      session_id: session.id
                    })
                  });

                  const result = await response.json();
                  if (result.success) {
                    success('注文完了', 'サービス注文が確定されました');
                    setShowServiceOrderDialog(false);
                    setSelectedService(null);
                    setServiceOrderQuantity(1);
                    await loadServiceOrders(session.id);
                  } else {
                    error('エラー', result.error || 'サービス注文の確定に失敗しました');
                  }
                } catch (err) {
                  console.error('サービス注文エラー:', err);
                  error('エラー', 'サービス注文の確定に失敗しました');
                }
              }}
              disabled={isOrderingDisabled || !selectedService || serviceOrderQuantity < 1}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              注文確定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 領収書プレビューダイアログ */}
      <Dialog open={showReceiptPreview} onOpenChange={setShowReceiptPreview}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>領収書プレビュー</DialogTitle>
            <DialogDescription>印刷される領収書の内容です</DialogDescription>
          </DialogHeader>
          {receiptPreviewData && (
            <div className="space-y-6 font-mono text-sm">
              {/* 延長料金 */}
              <div className="rounded border border-gray-200 p-4 bg-gray-50">
                <div className="text-center font-semibold mb-2">{receiptPreviewData.extension.storeName}</div>
                <div className="text-center text-xs text-gray-600 mb-1">{receiptPreviewData.extension.tableName}</div>
                <div className="text-center font-medium mb-3">{receiptPreviewData.extension.title}</div>
                <div className="text-xs text-gray-500 mb-2">
                  {receiptPreviewData.extension.issuedAt.toLocaleString('ja-JP')}
                </div>
                <div className="space-y-1 border-t pt-2">
                  {receiptPreviewData.extension.lines.map((line, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{line.left}</span>
                      {line.right && <span>{line.right}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-semibold border-t mt-2 pt-2">
                  <span>{receiptPreviewData.extension.totalLabel}</span>
                  <span>{`¥${(receiptPreviewData.extension.totalAmount || 0).toLocaleString('ja-JP')}`}</span>
                </div>
                {(receiptPreviewData.extension.footerAddress || receiptPreviewData.extension.footerPhone) && (
                  <div className="text-center text-xs text-gray-700 pt-2 mt-2 border-t space-y-1">
                    {receiptPreviewData.extension.footerAddress && <div>住所: {receiptPreviewData.extension.footerAddress}</div>}
                    {receiptPreviewData.extension.footerPhone && <div>電話番号: {receiptPreviewData.extension.footerPhone}</div>}
                  </div>
                )}
              </div>
              {/* 現在料金 */}
              <div className="rounded border border-gray-200 p-4 bg-gray-50">
                <div className="text-center font-semibold mb-2">{receiptPreviewData.current.storeName}</div>
                <div className="text-center text-xs text-gray-600 mb-1">{receiptPreviewData.current.tableName}</div>
                <div className="text-center font-medium mb-3">{receiptPreviewData.current.title}</div>
                <div className="text-xs text-gray-500 mb-2">
                  {receiptPreviewData.current.issuedAt.toLocaleString('ja-JP')}
                </div>
                <div className="space-y-1 border-t pt-2">
                  {receiptPreviewData.current.lines.map((line, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{line.left}</span>
                      {line.right && <span>{line.right}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-semibold border-t mt-2 pt-2">
                  <span>{receiptPreviewData.current.totalLabel}</span>
                  <span>{`¥${(receiptPreviewData.current.totalAmount || 0).toLocaleString('ja-JP')}`}</span>
                </div>
                {(receiptPreviewData.current.footerAddress || receiptPreviewData.current.footerPhone) && (
                  <div className="text-center text-xs text-gray-700 pt-2 mt-2 border-t space-y-1">
                    {receiptPreviewData.current.footerAddress && <div>住所: {receiptPreviewData.current.footerAddress}</div>}
                    {receiptPreviewData.current.footerPhone && <div>電話番号: {receiptPreviewData.current.footerPhone}</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
