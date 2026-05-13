'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Clock, ShoppingCart, Utensils, Users, DollarSign, CheckCircle, Bell, Trash2, CreditCard, Wine, Plus, Minus, Edit2, Save, XCircle, LogOut, Pause, Play, Package, Coffee, Printer, FileText, Timer } from 'lucide-react';
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
import {
  fetchStoreName,
  fetchStoreAddress,
  fetchStorePhone,
  fetchReceiptGreeting,
  fetchPaymentId,
  fetchStoreId,
  buildFullReceipt,
  buildExtensionInfoReceipt,
} from '@/lib/printing/receipt-builders';
import { buildFullReceiptTextEscPos, buildExtensionInfoReceiptTextEscPos } from '@/lib/printing/escpos-text';
import { removeLatestExtensionRoomSurcharges } from '@/lib/remove-latest-extension-room-surcharges';
import { perNominationExtensionCharge, extensionUnitPrice as nominationExtensionUnitFromEntry } from '@/lib/nomination-extension-fee';
import { nominationOrderLineTotal } from '@/lib/nomination-order-line-total';
import { getCastRealtimeSubtitle } from '@/lib/cast-realtime-subtitle';
import type { FullReceiptPayload, ExtensionInfoReceiptPayload } from '@/lib/printing/escpos-raster';
import {
  previewFullReceiptInWindow,
  printFullReceiptViaOs,
  printExtensionInfoReceiptViaOs,
} from '@/lib/printing/os-print';
import {
  normalizeSessionTimeStep,
  parseHHMM,
  setLocalTimeFromHHMMSnapped,
  shiftLocalStartByStep,
} from '@/lib/session-set-time';

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
    id?: number;
    type: 'bottle_keep' | 'vip_room' | 'karaoke';
    count: number;
    charge: number;
    timestamp: number;
    note?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [orderRequestStatus, setOrderRequestStatus] = useState<{[key: string]: 'pending' | 'sent' | 'accepted' | 'rejected'}>({});
  const [serviceRequestStatus, setServiceRequestStatus] = useState<{[key: string]: 'pending' | 'sent' | 'accepted' | 'rejected'}>({});
  
  // セット延長関連
  const [showSetExtensionDialog, setShowSetExtensionDialog] = useState(false);
  const [extensionGuestCount, setExtensionGuestCount] = useState<string>('');
  const [showSetJoinDialog, setShowSetJoinDialog] = useState(false);
  const [joinGuestCount, setJoinGuestCount] = useState<string>('1');
  
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
  const [lastPaymentMethod, setLastPaymentMethod] = useState<string>(''); // 領収書用: 現金 / クレジットカード / 店舗用クレジットカード
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isProcessingStoreCreditCardPayment, setIsProcessingStoreCreditCardPayment] = useState<boolean>(false);

  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptPreviewData, setReceiptPreviewData] = useState<FullReceiptPayload | null>(null);

  const [showExtensionInfoPreview, setShowExtensionInfoPreview] = useState(false);
  const [extensionInfoPreviewData, setExtensionInfoPreviewData] = useState<ExtensionInfoReceiptPayload | null>(null);

  const buildReceiptData = async (): Promise<FullReceiptPayload | null> => {
    if (!session || !tableId) return null;
    const [storeName, storeAddress, storePhone, greeting, paymentId, storeId] = await Promise.all([
      fetchStoreName(),
      fetchStoreAddress(),
      fetchStorePhone(),
      fetchReceiptGreeting(),
      fetchPaymentId(),
      fetchStoreId(),
    ]);
    const tableNumber = String(tableData?.name ?? tableId);
    return buildFullReceipt({
      storeName,
      storeAddress,
      storePhone,
      storeId,
      greeting,
      paymentId,
      tableNumber,
      sessionStartTime: session.created_at,
      guestCount: String(guestCount || ''),
      paymentMethod: lastPaymentMethod || '－',
      cartOrders,
      orderRequestStatus,
      addCharges,
      setExtensions,
      nominations: nominations as any,
      additionalServices,
    });
  };

  const tryAutoPrintReceipts = async () => {
    if (printer.status !== 'connected' && !printer.isNetworkPrinterReady) return;
    if (!session || !tableId || !tableData) return;
    try {
      const payload = await buildReceiptData();
      if (!payload) return;
      await printer.requestPrint(buildFullReceiptTextEscPos(payload), '領収書自動印刷', {
        osFallback: () => printFullReceiptViaOs(payload),
        eposPayload: payload,
      });
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
      const payload = await buildReceiptData();
      if (!payload) return;
      // iPad / iOS では Web Bluetooth に制限があるため、OS の印刷ダイアログ経由で印刷する
      const escposData = buildFullReceiptTextEscPos(payload);
      await printer.requestPrint(escposData, '領収書印刷', {
        osFallback: () => printFullReceiptViaOs(payload),
        eposPayload: payload,
      });
    } catch (e) {
      console.error('領収書印刷エラー:', e);
      error('エラー', '領収書データの生成に失敗しました');
    }
  };

  const handleShowReceiptPreview = async () => {
    if (!session || !tableId) {
      error('エラー', 'セッション情報がありません');
      return;
    }
    try {
      const payload = await buildReceiptData();
      if (!payload) return;
      setReceiptPreviewData(payload);
      setShowReceiptPreview(true);
    } catch (e) {
      console.error('領収書プレビューエラー:', e);
      error('エラー', 'プレビューの生成に失敗しました');
    }
  };

  const buildExtensionInfoReceiptData = async (): Promise<ExtensionInfoReceiptPayload | null> => {
    if (!session || !tableId) return null;
    const storeName = await fetchStoreName();
    const tableNumber = String(tableData?.name ?? tableId);
    return buildExtensionInfoReceipt({
      storeName,
      tableNumber,
      guestCount: String(guestCount || ''),
      cartOrders,
      orderRequestStatus,
      addCharges,
      setExtensions,
      nominations: nominations as any,
      additionalServices,
      extensionMinutes: 60,
    });
  };

  const handlePrintExtensionInfoReceipt = async () => {
    if (!session || !tableId) {
      error('エラー', 'セッション情報がありません');
      return;
    }
    try {
      const payload = await buildExtensionInfoReceiptData();
      if (!payload) return;
      const escposData = buildExtensionInfoReceiptTextEscPos(payload);
      await printer.requestPrint(escposData, '延長料金レシート印刷', {
        osFallback: () => printExtensionInfoReceiptViaOs(payload),
        eposPayload: payload,
      });
    } catch (e) {
      console.error('延長料金レシート印刷エラー:', e);
      error('エラー', '延長料金レシートの生成に失敗しました');
    }
  };

  const handleShowExtensionInfoReceiptPreview = async () => {
    if (!session || !tableId) {
      error('エラー', 'セッション情報がありません');
      return;
    }
    try {
      const payload = await buildExtensionInfoReceiptData();
      if (!payload) return;
      setExtensionInfoPreviewData(payload);
      setShowExtensionInfoPreview(true);
    } catch (e) {
      console.error('延長料金レシートプレビューエラー:', e);
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
  const [vipRooms, setVipRooms] = useState<Array<{ id: number; name: string; status: number; other: string | null }>>([]);
  const [selectedVipRoomId, setSelectedVipRoomId] = useState<string>('');
  const [songRooms, setSongRooms] = useState<Array<{ id: number; name: string; status: number; other: string | null }>>([]);
  const [selectedSongRoomId, setSelectedSongRoomId] = useState<string>('');
  const [timeAdjustStepMin, setTimeAdjustStepMin] = useState<5 | 10 | 15>(5);
  const [startTimeDraft, setStartTimeDraft] = useState<string | null>(null);
  const [endTimeDraft, setEndTimeDraft] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/project-variables?name=session_time_adjust_step_min', { cache: 'no-store' });
        const j = await res.json();
        const n = Number(j?.data?.value);
        if (!cancelled && Number.isFinite(n)) setTimeAdjustStepMin(normalizeSessionTimeStep(n));
      } catch {
        // ignore (default 5)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showVipRoomDialog) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/vip-room');
        const j = await r.json();
        if (!cancelled && j.success) setVipRooms(j.rooms || []);
      } catch {
        if (!cancelled) setVipRooms([]);
      }
    })();
    setSelectedVipRoomId('');
    return () => {
      cancelled = true;
    };
  }, [showVipRoomDialog]);

  useEffect(() => {
    if (!showKaraokeDialog) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/song-room');
        const j = await r.json();
        if (!cancelled && j.success) setSongRooms(j.rooms || []);
      } catch {
        if (!cancelled) setSongRooms([]);
      }
    })();
    setSelectedSongRoomId('');
    return () => {
      cancelled = true;
    };
  }, [showKaraokeDialog]);

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
          const prevStr = JSON.stringify(prev.map((s: any) => ({ id: s.id, type: s.type, count: s.count, charge: s.charge, timestamp: s.timestamp, note: s.note })));
          const newStr = JSON.stringify(newServices.map((s: any) => ({ id: s.id, type: s.type, count: s.count, charge: s.charge, timestamp: s.timestamp, note: s.note })));
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
          const st =
            result.data.status === 'accepted'
              ? 'accepted'
              : result.data.status === 'rejected'
                ? 'rejected'
                : 'sent';
          setOrderRequestStatus(prev => ({ ...prev, [result.data.id]: st }));
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

  const cancelSession = async () => {
    if (!session || !tableId) return;

    confirm(
      'セッション取消',
      'このセッションを取り消しますか？注文・指名・追加サービス・決済履歴など、このセッションに関連するデータは保存されず削除されます。',
      async () => {
        try {
          const response = await fetch(`/api/sessions/${session.id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'セッションの取消に失敗しました');
          }

          setSession(null);
          setCartOrders([]);
          setServiceOrders([]);
          setNominations([]);
          setSetExtensions([]);
          setGuestCount('');
          setSetExtensionCountdown(0);
          setAdditionalServices([]);
          setOrderRequestStatus({});
          setServiceRequestStatus({});
          setIsPaymentCompleted(false);
          setPaidAmount(0);
          setLastPaymentMethod('');
          setManualTotal(null);
          setShowPaymentDialog(false);
          setShowPaymentMethodDialog(false);
          setShowCashPaymentDialog(false);
          setShowStoreCreditCardPaymentDialog(false);

          success('セッション取消', 'セッションを取り消しました');

          setTimeout(() => {
            onClose();
          }, 500);
        } catch (err) {
          console.error('セッション取消エラー:', err);
          error('エラー', `セッション取消に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
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

  // 指名料金の合計を計算（注文合計・明細右列と同じ式）
  const calculateNominationCharges = (): number => {
    return nominations.reduce(
      (sum, n) => sum + nominationOrderLineTotal(n, setExtensions, addCharges),
      0
    );
  };

  // キャストリストを取得
  const loadCasts = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsCastsLoading(true);
    try {
      const response = await fetch('/api/casts?only_active=true', { cache: 'no-store' });
      const result = await response.json();
      if (result.success) {
        setCasts(result.data || []);
      }
    } catch (error) {
      console.error('キャスト取得エラー:', error);
    } finally {
      if (!opts?.silent) setIsCastsLoading(false);
    }
  };

  useEffect(() => {
    const needPoll =
      !!session &&
      !!tableId &&
      (leftMode === 'nomination' ||
        (leftMode === 'order' && isForCast) ||
        showNominationCastDialog ||
        showCastSelectionDialog ||
        (showOrderDialog && isForCast));

    if (!needPoll) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void loadCasts({ silent: true });
    };

    const id = setInterval(tick, 5000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    tick();
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [
    session,
    tableId,
    leftMode,
    isForCast,
    showNominationCastDialog,
    showCastSelectionDialog,
    showOrderDialog,
  ]);

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
        const togetherCharge = charges['together'] || 0;
        // 同伴指名は同伴料金に指名料金が含まれるため、最初のセットでは同伴料金のみ
        nominationCharge = togetherCharge;
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

  const handleVipRoomConfirm = async () => {
    if (!session) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、追加サービスを利用できません' : 'セット時間が終了したため、追加サービスを利用できません');
      return;
    }
    if (!selectedVipRoomId) {
      error('エラー', 'ルームを選択してください');
      return;
    }
    const roomId = parseInt(selectedVipRoomId, 10);
    const room = vipRooms.find(r => r.id === roomId);
    if (!room) {
      error('エラー', 'ルーム情報が見つかりません');
      return;
    }
    if (room.status === 1) {
      error('通知', 'その部屋は現在利用中です');
      return;
    }
    let charges = addCharges;
    if (Object.keys(charges).length === 0) {
      try {
        const chargesResponse = await fetch('/api/add-charges');
        const chargesResult = await chargesResponse.json();
        if (chargesResult.success && chargesResult.charges) {
          const chargesMap: { [key: string]: number } = {};
          chargesResult.charges.forEach((charge: any) => {
            chargesMap[charge.charge_name] = parseFloat(charge.value) || 0;
          });
          charges = chargesMap;
          setAddCharges(chargesMap);
        }
      } catch (err) {
        console.error('追加料金取得エラー:', err);
      }
    }
    const vipUnit = charges['vip_room'] || 0;
    const reserveRes = await fetch(`/api/vip-room/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    });
    const reserveJson = await reserveRes.json();
    if (!reserveRes.ok || !reserveJson.success) {
      error('通知', reserveJson.error === 'この部屋は現在利用中です' || reserveJson.occupied ? 'その部屋は現在利用中です' : (reserveJson.error || 'ルームの予約に失敗しました'));
      const r2 = await fetch('/api/vip-room');
      const j2 = await r2.json();
      if (j2.success) setVipRooms(j2.rooms || []);
      return;
    }
    const additionalServiceResponse = await fetch('/api/additional-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        type: 'vip_room',
        count: 1,
        charge: vipUnit,
        note: room.name,
      }),
    });
    const additionalServiceResult = await additionalServiceResponse.json();
    if (!additionalServiceResult.success) {
      error('エラー', additionalServiceResult.error || '追加サービスの登録に失敗しました');
      return;
    }
    const newService = additionalServiceResult.data;
    setAdditionalServices(prev => [...prev, newService]);
    setShowVipRoomDialog(false);
    setSelectedVipRoomId('');
    const rList = await fetch('/api/vip-room');
    const jList = await rList.json();
    if (jList.success) setVipRooms(jList.rooms || []);
    await loadAdditionalServices(session.id);
    success('VIPルーム利用', `${room.name} を利用として登録しました`);
  };

  const handleKaraokeConfirm = async () => {
    if (!session) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、追加サービスを利用できません' : 'セット時間が終了したため、追加サービスを利用できません');
      return;
    }
    if (!selectedSongRoomId) {
      error('エラー', 'ルームを選択してください');
      return;
    }
    const roomId = parseInt(selectedSongRoomId, 10);
    const room = songRooms.find(r => r.id === roomId);
    if (!room) {
      error('エラー', 'ルーム情報が見つかりません');
      return;
    }
    if (room.status === 1) {
      error('通知', 'その部屋は現在利用中です');
      return;
    }
    let charges = addCharges;
    if (Object.keys(charges).length === 0) {
      try {
        const chargesResponse = await fetch('/api/add-charges');
        const chargesResult = await chargesResponse.json();
        if (chargesResult.success && chargesResult.charges) {
          const chargesMap: { [key: string]: number } = {};
          chargesResult.charges.forEach((charge: any) => {
            chargesMap[charge.charge_name] = parseFloat(charge.value) || 0;
          });
          charges = chargesMap;
          setAddCharges(chargesMap);
        }
      } catch (err) {
        console.error('追加料金取得エラー:', err);
      }
    }
    const songUnit = charges['song_room'] || 0;
    const reserveRes = await fetch(`/api/song-room/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    });
    const reserveJson = await reserveRes.json();
    if (!reserveRes.ok || !reserveJson.success) {
      error('通知', reserveJson.error === 'この部屋は現在利用中です' || reserveJson.occupied ? 'その部屋は現在利用中です' : (reserveJson.error || 'ルームの予約に失敗しました'));
      const r2 = await fetch('/api/song-room');
      const j2 = await r2.json();
      if (j2.success) setSongRooms(j2.rooms || []);
      return;
    }
    const additionalServiceResponse = await fetch('/api/additional-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        type: 'karaoke',
        count: 1,
        charge: songUnit,
        note: room.name,
      }),
    });
    const additionalServiceResult = await additionalServiceResponse.json();
    if (!additionalServiceResult.success) {
      error('エラー', additionalServiceResult.error || '追加サービスの登録に失敗しました');
      return;
    }
    const newService = additionalServiceResult.data;
    setAdditionalServices(prev => [...prev, newService]);
    setShowKaraokeDialog(false);
    setSelectedSongRoomId('');
    const rList = await fetch('/api/song-room');
    const jList = await rList.json();
    if (jList.success) setSongRooms(jList.rooms || []);
    await loadAdditionalServices(session.id);
    success('カラオケ利用', `${room.name} を利用として登録しました`);
  };

  // セット延長処理
  const handleSetExtension = () => {
    const currentGuests = Number(session?.client || parseInt(guestCount || '0', 10) || 1);
    setExtensionGuestCount(String(Math.max(1, currentGuests)));
    setShowSetExtensionDialog(true);
  };

  const handleSetJoin = () => {
    setJoinGuestCount('1');
    setShowSetJoinDialog(true);
  };

  const confirmSetJoin = async () => {
    if (!session) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }
    const addCount = parseInt(joinGuestCount, 10);
    if (isNaN(addCount) || addCount <= 0) {
      error('エラー', '有効な人数を入力してください');
      return;
    }

    try {
      const currentGuests = Number(session.client || parseInt(guestCount || '0', 10) || 0);
      const nextGuests = currentGuests + addCount;
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: nextGuests }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'セット追加に失敗しました');
      }
      setSession(prev => (prev ? { ...prev, client: nextGuests } : prev));
      setGuestCount(String(nextGuests));
      setShowSetJoinDialog(false);
      setJoinGuestCount('1');
      await loadSession();
      success('セット追加', `${addCount}名分のセットを追加しました`);
    } catch (err) {
      console.error('セット追加エラー:', err);
      error('エラー', err instanceof Error ? err.message : 'セット追加に失敗しました');
    }
  };

  const appendExtensionRoomSurcharges = async (
    sessionId: number,
    chargesMap: { [key: string]: number },
    servicesSnapshot: typeof additionalServices
  ) => {
    const hasVip = servicesSnapshot.some(s => s.type === 'vip_room');
    const hasKaraoke = servicesSnapshot.some(s => s.type === 'karaoke');
    const vipUnit = chargesMap['vip_room'] || 0;
    const songUnit = chargesMap['song_room'] || 0;
    try {
      if (hasVip && vipUnit > 0) {
        await fetch('/api/additional-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            type: 'vip_room',
            count: 1,
            charge: vipUnit,
            note: 'セット延長',
          }),
        });
      }
      if (hasKaraoke && songUnit > 0) {
        await fetch('/api/additional-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            type: 'karaoke',
            count: 1,
            charge: songUnit,
            note: 'セット延長',
          }),
        });
      }
      await loadAdditionalServices(sessionId);
    } catch (e) {
      console.error('セット延長時のルーム料金追加エラー:', e);
    }
  };

  const confirmSetExtension = async () => {
    if (!extensionGuestCount || extensionGuestCount.trim() === '' || !session) {
      error('エラー', '人数を入力してください');
      return;
    }

    const additionalSnap = [...additionalServices];
    const sessionIdForExtension = session.id;

    const count = parseInt(extensionGuestCount);
    if (isNaN(count) || count <= 0) {
      error('エラー', '有効な人数を入力してください');
      return;
    }

    // addChargesが空の場合は再取得
    let charges = addCharges;
    if (Object.keys(charges).length === 0) {
      try {
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
      } catch (err) {
        console.error('追加料金取得エラー:', err);
      }
    }

    const extensionPricePerGuest = charges['extension_price'] || 0;
    const savedNominationUnit = Number((setExtensions?.[0] as any)?.nomination_unit);
    const nominationUnit =
      Number.isFinite(savedNominationUnit) && savedNominationUnit >= 0
        ? savedNominationUnit
        : Number(charges['main']) || 0;
    const newExtension = {
      count,
      timestamp: Date.now(),
      price: extensionPricePerGuest * count,
      nomination_unit: nominationUnit,
    };
    const updatedExtensions = [...setExtensions, newExtension];

    const newSetCount = (session.set_count || 1) + 1;

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

      // 各指名のcostを更新（延長のたびに本指名料金相当を加算）
      const extUnitPerGuest = nominationExtensionUnitFromEntry(newExtension, charges['extension_price'] || 0);
      const nominationDeltaById = new Map<number, { add: number; toMainFlag?: 1; rankCostAdd: number; rankPointAdd: number }>();

      for (const nomination of nominations) {
        const charge = nominationUnit;
        if (charge > 0) {
          nominationDeltaById.set(Number(nomination.id), {
            add: charge,
            ...(nomination.type_id === 'inside' ? { toMainFlag: 1 as const } : {}),
            rankCostAdd: extUnitPerGuest + charge,
            rankPointAdd: 1,
          });
          try {
            await fetch(`/api/nominations/${nomination.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cost: charge,
                ...(nomination.type_id === 'inside' ? { tomain_nomination: 1 } : {}),
                rank_cost_add: extUnitPerGuest + charge,
                rank_point_add: 1,
              }),
            });
          } catch (err) {
            console.error(`指名ID ${nomination.id} のcost更新エラー:`, err);
          }
        }
      }

      // 指名のUI即時反映
      if (nominationDeltaById.size > 0) {
        setNominations(prev =>
          prev.map((n: any) => {
            const delta = nominationDeltaById.get(Number(n.id));
            if (!delta) return n;
            const currentCost = Number(n.cost);
            const nextCost = (Number.isFinite(currentCost) ? currentCost : 0) + delta.add;
            return {
              ...n,
              cost: nextCost,
              tomain_nomination: delta.toMainFlag ?? n.tomain_nomination ?? 0,
              rank_cost: (Number(n.rank_cost) || 0) + (Number(delta.rankCostAdd) || 0),
              rank_point: (Number(n.rank_point) || 0) + (Number(delta.rankPointAdd) || 0),
              updated_at: new Date().toISOString(),
            };
          })
        );
      }

      setSetExtensions(updatedExtensions);
      setShowSetExtensionDialog(false);
      setExtensionGuestCount('');
      await loadSession();
      await appendExtensionRoomSurcharges(sessionIdForExtension, charges, additionalSnap);
      if (session?.id) await loadNominations(session.id);
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
          const res = await fetch(`/api/sessions/${session.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              set_count: newSetCount,
              set_extensions: updatedExtensions
            })
          });
          const json = await res.json().catch(() => ({}));
          if (!json.success) {
            throw new Error(json.error || 'セットキャンセルの更新に失敗しました');
          }

          let charges = addCharges;
          if (Object.keys(charges).length === 0) {
            try {
              const chargesResponse = await fetch('/api/add-charges');
              const chargesResult = await chargesResponse.json();
              if (chargesResult.success && chargesResult.charges) {
                const chargesMap: { [key: string]: number } = {};
                chargesResult.charges.forEach((ch: any) => {
                  chargesMap[ch.charge_name] = parseFloat(ch.value) || 0;
                });
                charges = chargesMap;
                setAddCharges(chargesMap);
              }
            } catch (e) {
              console.error('追加料金取得エラー:', e);
            }
          }

          const extUnitForCanceled = nominationExtensionUnitFromEntry(lastExtension, charges['extension_price'] || 0);
          const canceledNominationUnitRaw = Number((lastExtension as any)?.nomination_unit);
          const canceledNominationUnit =
            Number.isFinite(canceledNominationUnitRaw) && canceledNominationUnitRaw >= 0
              ? canceledNominationUnitRaw
              : Number((updatedExtensions?.[0] as any)?.nomination_unit) || Number(charges['main']) || 0;
          for (const nomination of nominations) {
            const charge = canceledNominationUnit;
            if (charge <= 0) continue;
            const createdMs = Date.parse(String(nomination.created_at || (nomination as any).updated_at || '')) || 0;
            const extAfter = updatedExtensions.filter((e: any) => {
              const ts = Number(e?.timestamp);
              return Number.isFinite(ts) && ts > createdMs;
            }).length;
            const body: Record<string, unknown> = {
              cost: -charge,
              rank_cost_add: -(extUnitForCanceled + charge),
              rank_point_add: -1,
            };
            if (nomination.type_id === 'inside' && extAfter === 0) {
              body.tomain_nomination = 0;
            }
            try {
              await fetch(`/api/nominations/${nomination.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
            } catch (e) {
              console.error(`セットキャンセル時 指名${nomination.id} 巻き戻しエラー:`, e);
            }
          }

          await removeLatestExtensionRoomSurcharges(session.id);
          setSetExtensions(updatedExtensions);
          await loadAdditionalServices(session.id);
          await loadSession();
          if (session?.id) await loadNominations(session.id);
          success('セットキャンセル', `${lastExtension.count}名分のセットをキャンセルしました`);
        } catch (err) {
          console.error('セットキャンセルエラー:', err);
          error('エラー', 'セットキャンセルに失敗しました');
        }
      }
    );
  };

  const lastAutoSavedRemainingRef = useRef<number | null>(null);
  const autoSaveRemainingTimerRef = useRef<any>(null);

  // 残り時間変更処理（停止中のみ）
  const handleChangeRemainingTime = async (opts?: { silent?: boolean; keepEditing?: boolean }) => {
    if (!session || !session.is_paused) {
      if (!opts?.silent) error('エラー', '停止中のみ残り時間を変更できます');
      return;
    }

    const minutes = parseInt(editingRemainingMinutes) || 0;
    const seconds = parseInt(editingRemainingSeconds) || 0;
    const newRemainingSeconds = minutes * 60 + seconds;

    if (newRemainingSeconds < 0) {
      if (!opts?.silent) error('エラー', '残り時間は0以上である必要があります');
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

      if (!opts?.keepEditing) {
        setIsEditingRemainingTime(false);
        setEditingRemainingMinutes('');
        setEditingRemainingSeconds('');
      }
      await loadSession();
      setTimeout(() => {
        loadSession();
      }, 500);
      if (!opts?.silent) success('残り時間変更', '残り時間を変更しました');
    } catch (err) {
      console.error('残り時間変更エラー:', err);
      if (!opts?.silent) error('エラー', err instanceof Error ? err.message : '残り時間の変更に失敗しました');
    }
  };

  useEffect(() => {
    if (!session?.is_paused) return;
    if (!isEditingRemainingTime) return;

    // 入力途中（空文字など）は保存しない
    const mStr = editingRemainingMinutes.trim();
    const sStr = editingRemainingSeconds.trim();
    if (mStr === '' || sStr === '') return;

    const minutes = Number(mStr);
    const seconds = Number(sStr);
    if (!Number.isFinite(minutes) || minutes < 0) return;
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 59) return;

    const next = Math.floor(minutes) * 60 + Math.floor(seconds);
    if (lastAutoSavedRemainingRef.current === next) return;

    if (autoSaveRemainingTimerRef.current) clearTimeout(autoSaveRemainingTimerRef.current);
    autoSaveRemainingTimerRef.current = setTimeout(async () => {
      lastAutoSavedRemainingRef.current = next;
      await handleChangeRemainingTime({ silent: true, keepEditing: true });
    }, 450);

    return () => {
      if (autoSaveRemainingTimerRef.current) clearTimeout(autoSaveRemainingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.is_paused, isEditingRemainingTime, editingRemainingMinutes, editingRemainingSeconds]);

  const formatHHMM = (d: Date) =>
    d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  const toTimeInputValue = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const patchStartTimeKeepingRemaining = async (nextCreated: Date) => {
    if (!session || !session.is_paused) {
      error('エラー', '停止中のみ時間を調整できます');
      return;
    }
    if (!session.created_at || !session.paused_at) {
      error('エラー', '時間情報が不足しています');
      return;
    }
    try {
      const deltaMs = nextCreated.getTime() - new Date(session.created_at).getTime();
      if (deltaMs === 0) return;
      const nextCreatedAt = nextCreated.toISOString();
      const nextPausedAt = new Date(new Date(session.paused_at).getTime() + deltaMs).toISOString();

      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created_at: nextCreatedAt, paused_at: nextPausedAt }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '時間の調整に失敗しました');
      if (result.data) setSession(prev => (prev ? { ...prev, ...result.data } : result.data));
      setIsEditingRemainingTime(false);
      setEditingRemainingMinutes('');
      setEditingRemainingSeconds('');
      await loadSession();
      setTimeout(() => loadSession(), 500);
      success('時間調整', '開始/終了時刻を調整しました（残り時間は維持）');
    } catch (err) {
      console.error('時間調整エラー:', err);
      error('エラー', err instanceof Error ? err.message : '時間の調整に失敗しました');
    }
  };

  const shiftStartEndByStep = async (direction: 1 | -1) => {
    if (!session?.created_at) return;
    const nextCreated = shiftLocalStartByStep(new Date(session.created_at), timeAdjustStepMin, direction);
    await patchStartTimeKeepingRemaining(nextCreated);
  };

  const applyStartTimeFromInput = async (raw: string) => {
    if (!session?.created_at) return;
    const parsed = parseHHMM(raw);
    if (!parsed) {
      error('エラー', '開始時刻は HH:mm 形式で入力してください');
      return;
    }
    const nextCreated = setLocalTimeFromHHMMSnapped(
      new Date(session.created_at),
      parsed.h,
      parsed.m,
      timeAdjustStepMin
    );
    await patchStartTimeKeepingRemaining(nextCreated);
  };

  const applyEndTimeFromInput = async (raw: string) => {
    if (!session?.created_at) return;
    const parsed = parseHHMM(raw);
    if (!parsed) {
      error('エラー', '終了時刻は HH:mm 形式で入力してください');
      return;
    }
    const setCount = session.set_count || 1;
    const oldCreated = new Date(session.created_at);
    const oldEnd = new Date(oldCreated.getTime() + setCount * 3600 * 1000);
    const nextEnd = setLocalTimeFromHHMMSnapped(oldEnd, parsed.h, parsed.m, timeAdjustStepMin);
    const nextCreated = new Date(oldCreated.getTime() + (nextEnd.getTime() - oldEnd.getTime()));
    await patchStartTimeKeepingRemaining(nextCreated);
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

      const togetherCharge = charges['together'] || 0;
      // 同伴指名は同伴料金に指名料金が含まれるため、最初のセットでは同伴料金のみ
      const nominationCharge = togetherCharge;

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
      setLastPaymentMethod('クレジットカード');
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
      setLastPaymentMethod('現金');
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
      setLastPaymentMethod('店舗用クレジットカード');
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

  if (!tableId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
      <div className="relative flex h-full max-h-[98vh] min-h-0 w-full max-w-[98vw] flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[95vh] sm:max-w-[95vw]">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 sm:px-6 py-3 sm:py-4 gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold truncate">テーブル {tableId} - 管理者ビュー</h2>
            <p className="text-xs sm:text-sm text-blue-100 truncate">セッション情報と注文状況を表示</p>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {session && (
              <Button
                variant="outline"
                size="sm"
                onClick={endSession}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 px-2 sm:px-3"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">セッション終了</span>
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

        {/* Content（min-h-0: 子の flex / スクロール高さ制約を正しく伝える） */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !session ? (
            <div className="text-center py-12 text-gray-500">
              <p>このテーブルにはアクティブなセッションがありません</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 min-h-0">
              {/* 左側: タブコンテンツ（注文・指名・サービス） */}
              <div className="lg:col-span-3 space-y-4 min-h-0 flex flex-col">
                {/* タブ */}
                <Tabs value={leftMode} onValueChange={(value) => setLeftMode(value as 'order' | 'nomination' | 'service')} className="flex min-h-0 w-full flex-col">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="order">注文</TabsTrigger>
                    <TabsTrigger value="nomination">指名</TabsTrigger>
                    <TabsTrigger value="service">サービス</TabsTrigger>
                  </TabsList>

                  {/* 注文タブ */}
                  <TabsContent value="order" className="mt-4 flex min-h-0 flex-1 flex-col outline-none">
                    <div
                      className={`flex min-h-0 flex-1 flex-col ${isTimeExpired ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      {/*
                        カテゴリ + 商品を同一の縦スクロールにまとめ、カテゴリのみ sticky。
                        Radix ScrollArea と外側の overflow を併用すると iPad で sticky がずれ、
                        商品がタブの下に食い込む原因になる。
                      */}
                      <div className="flex max-h-[min(70dvh,calc(100dvh-14rem))] min-h-[220px] flex-1 flex-col overflow-hidden rounded-lg border border-purple-100/70 bg-white/50 sm:max-h-[min(72dvh,calc(100dvh-13rem))] lg:max-h-[calc(100dvh-11rem)]">
                        <div className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain">
                          <div className="sticky top-0 z-40 border-b border-gray-200/90 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pt-2 pb-2 shadow-sm">
                            <div className="flex items-center overflow-x-auto overflow-y-hidden pl-2 sm:pl-5">
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
                                      'relative h-8 select-none whitespace-nowrap px-3 text-xs font-semibold sm:h-10 sm:px-5 sm:text-sm',
                                      'skew-x-12',
                                      idx === 0 ? '' : '-ml-2 sm:-ml-3',
                                      active
                                        ? 'z-20 bg-purple-600 text-white shadow-md'
                                        : 'z-10 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                                      'rounded-none',
                                    ].join(' ')}
                                  >
                                    <span className="inline-block -skew-x-12">{tab.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 pb-8 sm:grid-cols-3 sm:gap-3 sm:p-3 lg:grid-cols-4">
                            {(() => {
                              const items = selectedCategoryId === 'all'
                                ? menuItems
                                : selectedCategoryId === '4'
                                  ? menuItems.filter((it: any) => Number(it.category_id) === 4)
                                  : menuItems.filter((it: any) => Number(it.category_id) === Number(selectedCategoryId));
                              if (!items || items.length === 0) {
                                return (
                                  <div className="col-span-2 py-10 text-center text-sm text-gray-500 sm:col-span-3 lg:col-span-4">
                                    該当する商品がありません
                                  </div>
                                );
                              }
                              return items.map((item: any) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    if (!isOrderingDisabled && !isTimeExpired) addToCart(item);
                                  }}
                                  className={`overflow-hidden rounded-lg border bg-white text-left shadow-sm transition-shadow hover:shadow-md ${isOrderingDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'}`}
                                  disabled={isOrderingDisabled}
                                >
                                  <div className="relative aspect-square bg-gray-100">
                                    {item.image ? (
                                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                                        <Package className="h-8 w-8" />
                                      </div>
                                    )}
                                    <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white sm:px-2 sm:py-1 sm:text-[11px]">
                                      {formatCurrency(item.sale_price)}
                                    </div>
                                  </div>
                                  <div className="p-1 sm:p-1.5">
                                    <div className="line-clamp-2 text-[11px] font-semibold leading-tight sm:text-[13px]">{item.name}</div>
                                    <div className="mt-0.5 text-[9px] text-gray-500 sm:mt-1 sm:text-[11px]">
                                      SKU: {item.sku ? item.sku : '-'}
                                    </div>
                                  </div>
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>

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
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* セット延長 */}
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="flex items-center text-sm font-semibold text-purple-800">
                      <Clock className="w-4 h-4 mr-2" />
                      セット延長
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col xl:flex-row gap-2 xl:gap-3">
                    <div className="w-full xl:w-1/2 bg-white rounded-md p-2 sm:p-3 border border-purple-200 text-center">
                      <div className="mb-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[11px] text-gray-500 text-left">
                            {session?.is_paused && session.created_at && session.paused_at ? (
                              <div className="grid grid-cols-1 gap-1.5 mt-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="shrink-0 w-7">開始</span>
                                  <Input
                                    type="time"
                                    step={timeAdjustStepMin * 60}
                                    className="h-7 text-[11px] px-1 flex-1 min-w-0"
                                    value={startTimeDraft ?? toTimeInputValue(new Date(session.created_at))}
                                    onFocus={() => setStartTimeDraft(toTimeInputValue(new Date(session.created_at)))}
                                    onChange={(e) => setStartTimeDraft(e.target.value)}
                                    onBlur={() => {
                                      const d = startTimeDraft;
                                      setStartTimeDraft(null);
                                      if (d === null || !session.created_at) return;
                                      const orig = toTimeInputValue(new Date(session.created_at));
                                      if (d === orig) return;
                                      void applyStartTimeFromInput(d);
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="shrink-0 w-7">終了</span>
                                  <Input
                                    type="time"
                                    step={timeAdjustStepMin * 60}
                                    className="h-7 text-[11px] px-1 flex-1 min-w-0"
                                    value={
                                      endTimeDraft ??
                                      toTimeInputValue(
                                        new Date(
                                          new Date(session.created_at).getTime() +
                                            (session.set_count || 1) * 3600 * 1000
                                        )
                                      )
                                    }
                                    onFocus={() =>
                                      setEndTimeDraft(
                                        toTimeInputValue(
                                          new Date(
                                            new Date(session.created_at).getTime() +
                                              (session.set_count || 1) * 3600 * 1000
                                          )
                                        )
                                      )
                                    }
                                    onChange={(e) => setEndTimeDraft(e.target.value)}
                                    onBlur={() => {
                                      const d = endTimeDraft;
                                      setEndTimeDraft(null);
                                      if (d === null || !session.created_at) return;
                                      const orig = toTimeInputValue(
                                        new Date(
                                          new Date(session.created_at).getTime() +
                                            (session.set_count || 1) * 3600 * 1000
                                        )
                                      );
                                      if (d === orig) return;
                                      void applyEndTimeFromInput(d);
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>開始 {session?.created_at ? formatHHMM(new Date(session.created_at)) : '--:--'}</div>
                                <div>
                                  終了{' '}
                                  {session?.created_at
                                    ? formatHHMM(
                                        new Date(
                                          new Date(session.created_at).getTime() +
                                            (session.set_count || 1) * 3600 * 1000
                                        )
                                      )
                                    : '--:--'}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <select
                              className="h-7 rounded border border-gray-200 bg-white px-2 text-[11px]"
                              value={timeAdjustStepMin}
                              onChange={async (e) => {
                                const n = normalizeSessionTimeStep(Number(e.target.value));
                                setTimeAdjustStepMin(n);
                                try {
                                  await fetch('/api/project-variables', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      name: 'session_time_adjust_step_min',
                                      value: String(n),
                                      other: '開始/終了時刻の調整単位（分）',
                                    }),
                                  });
                                } catch {
                                  // ignore
                                }
                              }}
                              title="調整単位（分）"
                            >
                              <option value={5}>5分</option>
                              <option value={10}>10分</option>
                              {/* <option value={15}>15分</option> */}
                            </select>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 text-sm font-semibold"
                            onClick={() => void shiftStartEndByStep(-1)}
                            disabled={!session?.is_paused}
                            title="開始/終了を前に（停止中のみ）"
                          >
                            <Minus className="w-4 h-4 mr-1" />
                            {timeAdjustStepMin}分
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 text-sm font-semibold"
                            onClick={() => void shiftStartEndByStep(1)}
                            disabled={!session?.is_paused}
                            title="開始/終了を後に（停止中のみ）"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {timeAdjustStepMin}分
                          </Button>
                        </div>
                      </div>
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
                          {/* <div className="text-[11px] text-gray-500">
                            入力内容は自動で保存されます
                          </div> */}
                        </div>
                      ) : (
                        <>
                          <div className={`text-2xl font-bold leading-none ${session?.is_paused ? 'text-gray-400' : 'text-purple-600'}`}>
                            {Math.floor(setExtensionCountdown / 60)}:{(setExtensionCountdown % 60).toString().padStart(2, '0')}
                          </div>
                          {/* <div className="text-[11px] text-gray-500 mt-1">
                            {Math.floor(setExtensionCountdown / 60)}分 {setExtensionCountdown % 60}秒
                          </div> */}
                          {session?.is_paused && (
                            <>
                              {/* <div className="text-xs text-orange-600 mt-1 font-semibold">停止中</div> */}
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
                    <div className="w-full xl:w-1/2 flex flex-col space-y-2">
                      <div className="text-sm text-gray-700">
                        <div>セット数: {session.set_count}</div>
                        <div>人数: {session.client}名</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={handleSetJoin}
                          size="sm"
                          variant="outline"
                          className="h-9 border-blue-300 text-blue-700 hover:bg-blue-50 px-1"
                        >
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" />
                          <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">セット追加</span>
                        </Button>
                        <Button
                          onClick={handleSetExtension}
                          size="sm"
                          className="h-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-1"
                        >
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" />
                          <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">セット延長</span>
                        </Button>
                        <Button
                          onClick={handleCancelSet}
                          size="sm"
                          disabled={setExtensionCountdown < 3600 || setExtensions.length === 0}
                          variant="outline"
                          className="h-9 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed px-1"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" />
                          <span className="text-[11px] sm:text-xs font-semibold leading-tight whitespace-nowrap">1セット<br />キャンセル</span>
                        </Button>
                        <Button
                          onClick={handlePauseResume}
                          size="sm"
                          variant={session?.is_paused ? "default" : "outline"}
                          className={session?.is_paused ? "h-9 bg-green-600 hover:bg-green-700 text-white px-1" : "h-9 border-purple-300 text-purple-700 hover:bg-purple-50 px-1"}
                        >
                          {session?.is_paused ? (
                            <>
                              <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" />
                              <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">再開</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" />
                              <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">停止</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>


                {/* 注文合計 */}
                <Card>
                  <CardHeader className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="flex items-center whitespace-nowrap">
                      <DollarSign className="w-5 h-5 mr-2 shrink-0" />
                      注文合計
                    </CardTitle>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintExtensionInfoReceipt}
                        className="h-8 gap-1 px-2"
                        title="現在料金 / 60分延長料金レシートを印刷"
                      >
                        <Timer className="w-4 h-4 shrink-0" />
                        <span className="hidden 2xl:inline">延長料金印刷</span>
                        <span className="2xl:hidden text-xs">延長</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShowExtensionInfoReceiptPreview}
                        className="h-8 px-2"
                        title="延長料金レシートのプレビュー"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintReceipt}
                        className="h-8 gap-1 px-2"
                        title="領収書印刷"
                      >
                        <Printer className="w-4 h-4 shrink-0" />
                        <span className="hidden 2xl:inline">領収書印刷</span>
                        <span className="2xl:hidden text-xs">領収</span>
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
                  <CardContent className="h-[460px] overflow-y-auto pr-2 space-y-4">
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
                      {/* 商品の明細（個別表示） */}
                      {(() => {
                        const acceptedOrders = cartOrders.filter(order => {
                          const status = orderRequestStatus[order.id] || order.status;
                          return status === 'accepted';
                        });
                        if (acceptedOrders.length > 0) {
                          return (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 mb-1">商品</div>
                              {acceptedOrders.map((order) => {
                                const unitPrice = Number(order.unit_price) || 0;
                                const qty = Number(order.amount) || 1;
                                const total = Number(order.total_price) || 0;
                                const breakdown = qty > 1 ? `¥${unitPrice.toLocaleString()} × ${qty}` : `¥${unitPrice.toLocaleString()}`;
                                return (
                                  <div key={order.id} className="flex justify-between items-start text-sm pl-3 gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-gray-700 truncate">{order.product_name}</div>
                                      <div className="text-gray-400 text-xs mt-0.5">{breakdown}</div>
                                    </div>
                                    <span className="flex-shrink-0">{formatCurrency(total)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* セッション料金 */}
                      {(() => {
                        if (guestCount && guestCount.trim() !== '') {
                          const cnt = parseInt(guestCount);
                          const unitPrice = addCharges['set_price'] || 0;
                          if (!isNaN(cnt) && cnt > 0 && unitPrice > 0) {
                            return (
                              <div className="flex justify-between items-start text-sm gap-2">
                                <div className="min-w-0 flex-1">
                                  <div>セッション料金</div>
                                  <div className="text-gray-400 text-xs mt-0.5">¥{unitPrice.toLocaleString()} × {cnt}名</div>
                                </div>
                                <span className="flex-shrink-0">{formatCurrency(unitPrice * cnt)}</span>
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}

                      {/* セット延長料金 */}
                      {setExtensions.map((extension, index) => {
                        const extensionUnit = addCharges['extension_price'] || 0;
                        const total = Number(extension.price ?? (extensionUnit * extension.count)) || 0;
                        return (
                          <div key={index} className="flex justify-between items-start text-sm gap-2">
                            <div className="min-w-0 flex-1">
                              <div>セット延長 ({index + 1}回目)</div>
                              <div className="text-gray-400 text-xs mt-0.5">¥{extensionUnit.toLocaleString()} × {extension.count}名</div>
                            </div>
                            <span className="flex-shrink-0">{formatCurrency(total)}</span>
                          </div>
                        );
                      })}

                      {/* 指名料金の明細 */}
                      {nominations.length > 0 && (
                        <div className="border-t pt-2 space-y-1">
                          <div className="text-xs font-semibold text-gray-600 mb-1">指名料金</div>
                          {nominations.map((nomination) => {
                            let typeLabel = '';
                            if (nomination.type_id === 'together') {
                              typeLabel = `${getNominationTypeLabel(nomination.type_id)} - ${nomination.cast_name}`;
                            } else if (nomination.type_id === 'main') {
                              typeLabel = `${getNominationTypeLabel(nomination.type_id)} - ${nomination.cast_name}`;
                            } else if (nomination.type_id === 'inside') {
                              const promoted = Number((nomination as any).tomain_nomination) === 1;
                              typeLabel = `${getNominationTypeLabel(nomination.type_id)}${promoted ? '（本指名へ昇格）' : ''} - ${nomination.cast_name}`;
                            }

                            const lineTotal = nominationOrderLineTotal(
                              nomination,
                              setExtensions,
                              addCharges
                            );
                            const totalCost = Number((nomination as any).cost) || 0;
                            const mainCharge = addCharges['main'] || 0;
                            const togetherCharge = addCharges['together'] || 0;
                            const createdMs = Date.parse(String(nomination.created_at || (nomination as any).updated_at || '')) || 0;
                            const extCountSince = setExtensions.filter((e: any) => {
                              const ts = Number(e?.timestamp);
                              return Number.isFinite(ts) && ts > createdMs;
                            }).length;
                            const extAddLegacy = mainCharge * extCountSince;
                            const rawInitial = (nomination as any).initial_nomination_cost;
                            const hasStoredInitial =
                              rawInitial != null &&
                              rawInitial !== '' &&
                              Number.isFinite(Number(rawInitial));
                            const initialDisplay = hasStoredInitial
                              ? Number(rawInitial)
                              : Math.max(0, totalCost - extAddLegacy);
                            const extSum = Math.max(0, totalCost - initialDisplay);
                            const relevantExts = setExtensions.filter((e: any) => {
                              const ts = Number(e?.timestamp);
                              return Number.isFinite(ts) && ts > createdMs;
                            });
                            const unitFromExtRaw = Number((relevantExts?.[0] as any)?.nomination_unit);
                            const perExt =
                              Number.isFinite(unitFromExtRaw) && unitFromExtRaw >= 0
                                ? unitFromExtRaw
                                : extCountSince > 0 && extSum > 0
                                  ? extSum / extCountSince
                                  : 0;
                            const fmtPerExt =
                              Math.abs(perExt - Math.round(perExt)) < 1e-6
                                ? Math.round(perExt).toLocaleString()
                                : perExt.toLocaleString(undefined, { maximumFractionDigits: 2 });

                            let breakdownText = '';
                            if (nomination.type_id === 'together') {
                              const baseInit = hasStoredInitial ? initialDisplay : togetherCharge;
                              if (baseInit > 0 || (extCountSince > 0 && extSum > 0)) {
                                breakdownText =
                                  baseInit > 0 ? `¥${baseInit.toLocaleString()}` : '';
                                if (extCountSince > 0 && extSum > 0) {
                                  breakdownText +=
                                    (breakdownText ? ' ＋ ' : '') +
                                    `¥${fmtPerExt}×${extCountSince}`;
                                }
                              }
                            } else if (extCountSince > 0 && extSum > 0) {
                              breakdownText = `¥${initialDisplay.toLocaleString()} ＋ ¥${fmtPerExt} × ${extCountSince}`;
                            } else {
                              const typeCharge = hasStoredInitial
                                ? initialDisplay
                                : addCharges[nomination.type_id] || 0;
                              if (typeCharge > 0) {
                                breakdownText = `¥${typeCharge.toLocaleString()}`;
                              }
                            }

                            return (
                              <div key={nomination.id} className="flex justify-between items-start text-sm pl-3 gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-gray-700 truncate">{typeLabel}</div>
                                  {breakdownText && (
                                    <div className="text-gray-400 text-xs mt-0.5">{breakdownText}</div>
                                  )}
                                </div>
                                <span className="flex-shrink-0">{formatCurrency(lineTotal)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* 追加サービス料金の明細 */}
                      {additionalServices.length > 0 && (
                        <div className="border-t pt-2 space-y-1">
                          <div className="text-xs font-semibold text-gray-600 mb-1">追加サービス</div>
                          {(() => {
                            const mergedTypes = ['vip_room', 'karaoke'] as const;

                            const merged = mergedTypes.flatMap((type) => {
                              const rows = additionalServices.filter((s: any) => s?.type === type);
                              if (rows.length === 0) return [];

                              const baseRows = rows.filter((s: any) => String(s?.note || '') !== 'セット延長');
                              const extRows = rows.filter((s: any) => String(s?.note || '') === 'セット延長');

                              const sumCharge = (arr: any[]) =>
                                arr.reduce((sum: number, s: any) => {
                                  const v = Number(s?.charge);
                                  return sum + (Number.isFinite(v) ? v : 0);
                                }, 0);

                              const baseTotal = sumCharge(baseRows);
                              const extTotal = sumCharge(extRows);
                              const extTimes = extRows.length;
                              const extUnit = extTimes > 0 ? extTotal / extTimes : 0;
                              const label = type === 'vip_room' ? 'VIPルーム利用' : 'カラオケ利用';

                              const fmt = (n: number) =>
                                Math.abs(n - Math.round(n)) < 1e-6
                                  ? Math.round(n).toLocaleString()
                                  : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

                              const parts: string[] = [];
                              if (baseTotal > 0) parts.push(`¥${fmt(baseTotal)}`);
                              if (extTimes > 0 && extUnit > 0) parts.push(`¥${fmt(extUnit)} × ${extTimes}`);
                              const breakdown = parts.join(' + ');
                              const total = baseTotal + extTotal;

                              return [
                                {
                                  key: `merged_${type}`,
                                  label,
                                  charge: total,
                                  breakdown,
                                },
                              ];
                            });

                            const otherRows = additionalServices.filter(
                              (s: any) => !mergedTypes.includes(s?.type)
                            );

                            const rendered = [
                              ...merged,
                              ...otherRows.map((service: any, index: number) => {
                                let serviceLabel = '';
                                let breakdownText = '';
                                if (service.type === 'bottle_keep') {
                                  serviceLabel = 'ボトルキープ';
                                } else if (service.type === 'vip_room') {
                                  serviceLabel = 'VIPルーム利用';
                                  if (service.note) breakdownText = service.note;
                                  else if (service.count > 1) {
                                    const unitCharge = service.charge / service.count;
                                    breakdownText = `¥${unitCharge.toLocaleString()} × ${service.count}部屋`;
                                  }
                                } else if (service.type === 'karaoke') {
                                  serviceLabel = 'カラオケ利用';
                                  if (service.note) breakdownText = service.note;
                                  else if (service.count > 1) {
                                    const unitCharge = service.charge / service.count;
                                    breakdownText = `¥${unitCharge.toLocaleString()} × ${service.count}曲`;
                                  }
                                }
                                return {
                                  key: `row_${index}`,
                                  label: serviceLabel,
                                  charge: service.charge,
                                  breakdown: breakdownText,
                                };
                              }),
                            ];

                            return rendered.map((row: any) => (
                              <div key={row.key} className="flex justify-between items-start text-sm pl-3 gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-gray-700 truncate">{row.label}</div>
                                  {row.breakdown && (
                                    <div className="text-gray-400 text-xs mt-0.5">{row.breakdown}</div>
                                  )}
                                </div>
                                <span className="flex-shrink-0">{formatCurrency(row.charge)}</span>
                              </div>
                            ));
                          })()}
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
                      <Button
                        onClick={cancelSession}
                        variant="outline"
                        className="w-full mt-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        セッション取消
                      </Button>
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

      {/* セット追加（合流）ダイアログ */}
      <Dialog open={showSetJoinDialog} onOpenChange={setShowSetJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              セット追加
            </DialogTitle>
            <DialogDescription>
              途中合流する人数を入力してください。現在の利用人数に追加し、人数分のセット料金を注文合計に加算します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-none bg-blue-50 p-3 text-sm text-blue-900">
              現在人数: {session?.client || guestCount || 0}名
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-guest-count">追加人数</Label>
              <Input
                id="join-guest-count"
                type="number"
                min="1"
                value={joinGuestCount}
                onChange={(e) => setJoinGuestCount(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                追加セット料金: {joinGuestCount && !isNaN(parseInt(joinGuestCount)) && parseInt(joinGuestCount) > 0
                  ? formatCurrency((addCharges['set_price'] || 0) * parseInt(joinGuestCount))
                  : formatCurrency(0)}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowSetJoinDialog(false);
                setJoinGuestCount('1');
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={confirmSetJoin}
              disabled={!joinGuestCount || joinGuestCount.trim() === '' || isNaN(parseInt(joinGuestCount)) || parseInt(joinGuestCount) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              追加確定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              同伴指名するキャストを選択してください。表示内容は数秒ごとに自動更新されます。
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
                      className="w-full justify-start h-auto py-3"
                      onClick={() => submitTogetherNomination(cast.id.toString(), cast.name)}
                    >
                      <Users className="w-4 h-4 mr-2 shrink-0 text-blue-600" />
                      <div className="text-left min-w-0">
                        <div className="font-medium">{cast.name}</div>
                        <div className="text-[11px] text-gray-500 leading-snug break-words">
                          {getCastRealtimeSubtitle(cast, { nominationType: 'together' })}
                        </div>
                      </div>
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
                        <div className="flex flex-col items-start gap-0.5 py-0.5 max-w-[280px]">
                          <span className="font-medium leading-tight">{cast.name}</span>
                          <span className="text-[10px] text-gray-500 leading-tight whitespace-normal">
                            {getCastRealtimeSubtitle(cast, {})}
                          </span>
                        </div>
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
              指名するキャストを選択してください。表示内容は数秒ごとに自動更新されます。
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
                      <p>該当するキャストがありません</p>
                    </div>
                  ) : (
                    casts.map((cast) => (
                      <Button
                        key={cast.id}
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleNomination(cast.id.toString(), cast.name, currentNominationType || 'main')}
                      >
                        <div className="flex items-start space-x-3 min-w-0">
                          <Users className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                          <div className="text-left min-w-0">
                            <div className="font-medium">{cast.name}</div>
                            <div className="text-[11px] text-gray-500 leading-snug break-words">
                              {getCastRealtimeSubtitle(cast, { nominationType: currentNominationType })}
                            </div>
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

      {/* VIPルーム */}
      <Dialog open={showVipRoomDialog} onOpenChange={setShowVipRoomDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              個室利用（VIPルーム）
            </DialogTitle>
            <DialogDescription>
              ルームを選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              追加料金（1回）: {formatCurrency(addCharges['vip_room'] || 0)}
            </p>
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {vipRooms.length === 0 ? (
                <p className="text-sm text-gray-500">登録されたVIPルームがありません。</p>
              ) : (
                vipRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedVipRoomId(String(room.id))}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
                      selectedVipRoomId === String(room.id) ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{room.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {room.status === 1 ? (
                        <span className="inline-flex items-center justify-center rounded-full border-2 border-amber-500 px-2 py-0.5 text-[10px] font-semibold text-amber-800 whitespace-nowrap">
                          利用中
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">空き</span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowVipRoomDialog(false);
                setSelectedVipRoomId('');
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleVipRoomConfirm}
              disabled={isOrderingDisabled || !selectedVipRoomId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              確認
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* カラオケルーム */}
      <Dialog open={showKaraokeDialog} onOpenChange={setShowKaraokeDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              カラオケルーム利用
            </DialogTitle>
            <DialogDescription>ルームを選択してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              追加料金（1回）: {formatCurrency(addCharges['song_room'] || 0)}
            </p>
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {songRooms.length === 0 ? (
                <p className="text-sm text-gray-500">登録されたカラオケルームがありません。</p>
              ) : (
                songRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedSongRoomId(String(room.id))}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
                      selectedSongRoomId === String(room.id) ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{room.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {room.status === 1 ? (
                        <span className="inline-flex items-center justify-center rounded-full border-2 border-amber-500 px-2 py-0.5 text-[10px] font-semibold text-amber-800 whitespace-nowrap">
                          利用中
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">空き</span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowKaraokeDialog(false);
                setSelectedSongRoomId('');
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleKaraokeConfirm}
              disabled={isOrderingDisabled || !selectedSongRoomId}
              className="bg-pink-600 hover:bg-pink-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              確認
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
            <div className="border border-gray-200 p-5 bg-white font-sans text-sm">
              <div className="text-center font-bold text-2xl mb-1">{receiptPreviewData.storeName}</div>
              <div className="text-center font-bold text-base mb-2">【 {receiptPreviewData.tableNumber} 】</div>
              <div className="text-center text-sm text-gray-700 whitespace-pre-line mb-3">{receiptPreviewData.greeting}</div>
              <div className="text-center text-xs text-gray-600 space-y-0.5 mb-3">
                {receiptPreviewData.storeAddress && <div>{receiptPreviewData.storeAddress}</div>}
                {receiptPreviewData.storePhone && <div>TEL:{receiptPreviewData.storePhone}</div>}
              </div>
              {receiptPreviewData.paymentId && (
                <div className="text-xs text-gray-600 mb-3">登録番号:{receiptPreviewData.paymentId}</div>
              )}
              <div className="border-t border-dashed border-gray-400 mb-2" />
              <table className="w-full text-xs border-collapse mb-2">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-2 font-bold">項目</th>
                    <th className="text-right py-1 w-12 font-bold">数量</th>
                    <th className="text-right py-1 font-bold">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptPreviewData.orderLines.map((row, i) => (
                    <tr key={i}>
                      <td className="py-0.5 pr-2">{row.item}</td>
                      <td className="text-right w-12">{row.qty}</td>
                      <td className="text-right">{row.amount.toLocaleString('ja-JP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span>小　計</span><span>{receiptPreviewData.subtotal.toLocaleString('ja-JP')}円</span></div>
                <div className="flex justify-between"><span>SC TAX</span><span>{receiptPreviewData.tax.toLocaleString('ja-JP')}円</span></div>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg mt-2">
                <span>合　計</span>
                <span>{receiptPreviewData.total.toLocaleString('ja-JP')}円</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">{receiptPreviewData.taxDetailText}</div>
              <div className="text-xs text-gray-600 mt-3 pt-2 border-t text-center space-y-0.5">
                <div>
                  {receiptPreviewData.storeId && <span>ID:{receiptPreviewData.storeId}</span>}
                  {receiptPreviewData.storeId && receiptPreviewData.paymentMethod && <span>{'  '}</span>}
                  <span>支払方法:{receiptPreviewData.paymentMethod}</span>
                </div>
                <div>
                  {receiptPreviewData.startTime && <span>開始時間:{receiptPreviewData.startTime}</span>}
                  {receiptPreviewData.startTime && receiptPreviewData.guestCount && <span>{'  '}</span>}
                  {receiptPreviewData.guestCount && <span>人数: {receiptPreviewData.guestCount}</span>}
                </div>
                {receiptPreviewData.nomineeNames && (
                  <div>指名:{receiptPreviewData.nomineeNames}</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 延長料金レシートプレビューダイアログ */}
      <Dialog open={showExtensionInfoPreview} onOpenChange={setShowExtensionInfoPreview}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>延長料金レシート プレビュー</DialogTitle>
            <DialogDescription>印刷される現在料金と延長料金の内容です</DialogDescription>
          </DialogHeader>
          {extensionInfoPreviewData && (
            <div className="border border-gray-200 p-5 bg-white font-sans text-sm">
              <div className="text-center font-bold text-4xl tracking-widest mb-2">
                {extensionInfoPreviewData.storeName}
              </div>
              <div className="text-center text-sm mb-4">
                【 {extensionInfoPreviewData.tableNumber} 】
              </div>
              <div className="border-t border-dashed border-black mb-2" />
              {[
                {
                  label: extensionInfoPreviewData.currentLabel,
                  total: extensionInfoPreviewData.currentTotal,
                  perPerson: extensionInfoPreviewData.currentPerPerson,
                  remainder: extensionInfoPreviewData.currentRemainder,
                },
                {
                  label: extensionInfoPreviewData.extensionLabel,
                  total: extensionInfoPreviewData.extensionTotal,
                  perPerson: extensionInfoPreviewData.extensionPerPerson,
                  remainder: extensionInfoPreviewData.extensionRemainder,
                },
              ].map((sec, i) => (
                <div key={i} className="mb-4">
                  <div className="text-center text-xs mb-1">【{sec.label}】</div>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="text-center text-3xl tracking-wider my-2">
                    ¥{sec.total.toLocaleString('ja-JP')}-
                  </div>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="text-center text-xs">
                    (お一人様 ¥{sec.perPerson.toLocaleString('ja-JP')}) (余り ¥{sec.remainder.toLocaleString('ja-JP')})
                  </div>
                </div>
              ))}
              {extensionInfoPreviewData.footerNote && (
                <div className="text-center text-xs mt-4">
                  {extensionInfoPreviewData.footerNote}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExtensionInfoPreview(false)}
            >
              閉じる
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                setShowExtensionInfoPreview(false);
                await handlePrintExtensionInfoReceipt();
              }}
              className="gap-1"
            >
              <Printer className="w-4 h-4" />
              印刷
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
