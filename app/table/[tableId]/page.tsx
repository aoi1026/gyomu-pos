'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Wine, Users, ShoppingCart, DollarSign, Clock, 
  ArrowLeft, Plus, Minus, Trash2, CheckCircle,
  AlertCircle, User, CreditCard, X, Bell, Utensils, Coffee, XCircle, AlertTriangle
} from 'lucide-react';
import { getCurrentTable, TableAuth, startTableSession, endTableSession } from '@/lib/table-auth';
import { mockCustomers, formatCurrency } from '@/lib/mock-data';
import { calculateBack, formatBackAmount, formatBackRate } from '@/lib/cast-back-system';
import { createNomination, getNominationTypeLabel } from '@/lib/nomination-system';
import { createStaffCall, createServiceOrder, getCallTypeLabel, getServiceTypeLabel } from '@/lib/staff-call-system';
import { createOrderNotification, getOrderTypeLabel } from '@/lib/order-monitoring-system';
import { useNotificationContext } from '@/lib/notification-context';
import StripeProvider from '@/components/providers/StripeProvider';
import StripePaymentForm from '@/components/payment/StripePaymentForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';


export default function TableDashboard({ params }: { params: { tableId: string } }) {
  const [tableAuth, setTableAuth] = useState<TableAuth | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNominationDialog, setShowNominationDialog] = useState(false);
  const [nominationType, setNominationType] = useState<'nomination' | 'field_nomination'>('nomination');
  const [nominationAmount, setNominationAmount] = useState<string>('');
  const [selectedNominationType, setSelectedNominationType] = useState<'nomination' | 'field_nomination' | null>(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [serviceType, setServiceType] = useState<'towel' | 'ashtray' | 'glass' | 'chopsticks' | 'other'>('towel');
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);
  const [serviceNote, setServiceNote] = useState<string>('');
  const [showServiceOrderDialog, setShowServiceOrderDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [serviceOrderQuantity, setServiceOrderQuantity] = useState<number>(1);
  const [selectedServiceCast, setSelectedServiceCast] = useState<string>('none');
  const [showCastSelection, setShowCastSelection] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [showFieldNominationDialog, setShowFieldNominationDialog] = useState(false);
  const [fieldNominationCast, setFieldNominationCast] = useState<string>('');
  const [showNominationTypeDialog, setShowNominationTypeDialog] = useState(false);
  const [selectedCastForNomination, setSelectedCastForNomination] = useState<{id: string, name: string} | null>(null);
  const [showNominationCastDialog, setShowNominationCastDialog] = useState(false);
  const [selectedNominationCast, setSelectedNominationCast] = useState<string>('');
  const [currentNominationType, setCurrentNominationType] = useState<'inside' | 'main' | null>(null);
  const [showManagerCallDialog, setShowManagerCallDialog] = useState(false);
  const [selectedCastForManagerCall, setSelectedCastForManagerCall] = useState<{id: string, name: string} | null>(null);
  const [managerCallStatus, setManagerCallStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [previousManagerCallStatus, setPreviousManagerCallStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [showNominationRequiredDialog, setShowNominationRequiredDialog] = useState(false);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [selectedCast, setSelectedCast] = useState<string>('none');
  const [casts, setCasts] = useState<any[]>([]);
  const [isCastsLoading, setIsCastsLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [isServicesLoading, setIsServicesLoading] = useState(true);
  const [cartOrders, setCartOrders] = useState<any[]>([]);
  const [countdownTimers, setCountdownTimers] = useState<{[key: string]: number}>({});
  const [orderRequestStatus, setOrderRequestStatus] = useState<{[key: string]: 'pending' | 'sent' | 'accepted' | 'rejected'}>({});
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [serviceRequestStatus, setServiceRequestStatus] = useState<{[key: string]: 'pending' | 'sent' | 'accepted' | 'rejected'}>({});
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState<boolean>(false);
  
  // 支払い完了後に商品の追加をロックするフラグ
  const hasAcceptedOrders = cartOrders.some(order => {
    const status = (orderRequestStatus as any)[order.id] || order.status;
    return status === 'accepted';
  });
  const isOrderingLocked = isPaymentCompleted && hasAcceptedOrders;
  
  const router = useRouter();
  const { success, error, confirm } = useNotificationContext();

  // キャスト一覧（APIから取得）
  const [availableCasts, setAvailableCasts] = useState<any[]>([]);

  useEffect(() => {
    const currentTable = getCurrentTable();
    if (!currentTable || currentTable.table_id !== params.tableId) {
      router.push('/');
      return;
    }
    
    setTableAuth(currentTable);
    // 既存の未完了セッションがある場合は復元してセッション中として扱う
    const existingSessionId = typeof window !== 'undefined' ? localStorage.getItem('current_session_id') : null;
    if (existingSessionId) {
      setIsSessionActive(true);
    } else {
    setIsSessionActive(currentTable.status === 'occupied');
    }
    setIsLoading(false);
    loadMenuData();
    loadServices();
    loadCasts();
  }, [params.tableId, router]);

  // tableAuthが設定された後にカートを読み込む
  useEffect(() => {
    if (tableAuth) {
      // まずローカルストレージから復元を試行
      loadCartOrdersFromStorage();
      loadServiceOrdersFromStorage();
      // 支払い完了状態を復元（セッションIDがある場合のみ）
      const sessionId = localStorage.getItem('current_session_id');
      const paymentCompleted = !!(sessionId && localStorage.getItem('payment_completed') === 'true');
      setIsPaymentCompleted(paymentCompleted);
      // 指名タイプを復元
      const savedNominationType = localStorage.getItem('nomination_type');
      if (savedNominationType === 'main' || savedNominationType === 'inside') {
        setCurrentNominationType(savedNominationType);
      }
      // その後APIから最新データを取得
      loadCartOrders();
      loadServiceOrders();
      loadManagerCallStatus();
    }
  }, [tableAuth]);

  // 定期的に店長呼び出しステータスと注文カートを確認
  useEffect(() => {
    if (!tableAuth || !isSessionActive) return;
    
    const interval = setInterval(() => {
      loadManagerCallStatus();
      loadCartOrdersSilently();
      loadServiceOrdersSilently();
    }, 500); // 500msごとに更新

    return () => clearInterval(interval);
  }, [tableAuth, isSessionActive]);

  const loadCasts = async () => {
    try {
      setIsCastsLoading(true);
      const response = await fetch('/api/casts');
      const result = await response.json();
      
      if (result.success) {
        setCasts(result.data);
        setAvailableCasts(result.data); // availableCastsも更新
      } else {
        error('エラー', 'キャストデータの取得に失敗しました');
      }
    } catch (err) {
      error('エラー', 'キャストデータの取得に失敗しました');
    } finally {
      setIsCastsLoading(false);
    }
  };

  const loadCartOrders = async () => {
    if (!tableAuth) return;
    
    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;

      const response = await fetch(`/api/salesorder?session_id=${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        setCartOrders(result.data);
        
        // ローカルストレージにカートデータを保存
        localStorage.setItem(`cart_orders_${sessionId}`, JSON.stringify(result.data));
        
        // データベースのステータスに基づいてUI表示を更新
        result.data.forEach((order: any) => {
          if (order.status === 'pending') {
            setOrderRequestStatus(prev => ({ ...prev, [order.id]: 'sent' }));
          } else if (order.status === 'accepted') {
            setOrderRequestStatus(prev => ({ ...prev, [order.id]: 'accepted' }));
          } else if (order.status === 'rejected') {
            setOrderRequestStatus(prev => ({ ...prev, [order.id]: 'rejected' }));
          }
        });
      }
    } catch (err) {
      console.error('カートデータ取得エラー:', err);
      // エラー時はローカルストレージから復元を試行
      loadCartOrdersFromStorage();
    }
  };

  const loadCartOrdersFromStorage = () => {
    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;

      const storedData = localStorage.getItem(`cart_orders_${sessionId}`);
      if (storedData) {
        const orders = JSON.parse(storedData);
        setCartOrders(orders);
        console.log('ローカルストレージからカートデータを復元しました');
      }
    } catch (err) {
      console.error('ローカルストレージからのカートデータ復元エラー:', err);
    }
  };

  const loadServiceOrders = async () => {
    if (!tableAuth) return;
    
    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;

      const response = await fetch(`/api/serviceorder?session_id=${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        setServiceOrders(result.data);
        
        // ローカルストレージにサービス注文データを保存
        localStorage.setItem(`service_orders_${sessionId}`, JSON.stringify(result.data));
        
        // データベースのステータスに基づいてUI表示を更新
        result.data.forEach((order: any) => {
          if (order.status === 'pending') {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'sent' }));
          } else if (order.status === 'accepted') {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'accepted' }));
          } else if (order.status === 'rejected') {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'rejected' }));
          }
        });
      }
    } catch (err) {
      console.error('サービス注文データ取得エラー:', err);
      // エラー時はローカルストレージから復元を試行
      loadServiceOrdersFromStorage();
    }
  };

  const loadServiceOrdersFromStorage = () => {
    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;

      const storedData = localStorage.getItem(`service_orders_${sessionId}`);
      if (storedData) {
        const orders = JSON.parse(storedData);
        setServiceOrders(orders);
        console.log('ローカルストレージからサービス注文データを復元しました');
      }
    } catch (err) {
      console.error('ローカルストレージからのサービス注文データ復元エラー:', err);
    }
  };

  // 静かな更新用の関数（ローディング状態を変更しない）
  const loadCartOrdersSilently = async () => {
    if (!tableAuth) return;
    
    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;

      const response = await fetch(`/api/salesorder?session_id=${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        setCartOrders(result.data);
        
        // ローカルストレージにカートデータを保存
        localStorage.setItem(`cart_orders_${sessionId}`, JSON.stringify(result.data));
        
        // データベースのステータスに基づいてUI表示を更新
        result.data.forEach((order: any) => {
          if (order.status === 'pending') {
            setOrderRequestStatus(prev => ({ ...prev, [order.id]: 'sent' }));
          } else if (order.status === 'accepted') {
            setOrderRequestStatus(prev => ({ ...prev, [order.id]: 'accepted' }));
          } else if (order.status === 'rejected') {
            setOrderRequestStatus(prev => ({ ...prev, [order.id]: 'rejected' }));
          }
        });
      }
    } catch (err) {
      console.error('カート注文データ取得エラー（静かな更新）:', err);
    }
  };

  const loadServiceOrdersSilently = async () => {
    if (!tableAuth) return;
    
    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;

      const response = await fetch(`/api/serviceorder?session_id=${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        setServiceOrders(result.data);
        
        // ローカルストレージにサービス注文データを保存
        localStorage.setItem(`service_orders_${sessionId}`, JSON.stringify(result.data));
        
        // データベースのステータスに基づいてUI表示を更新
        result.data.forEach((order: any) => {
          if (order.status === 'pending') {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'sent' }));
          } else if (order.status === 'accepted') {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'accepted' }));
          } else if (order.status === 'rejected') {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'rejected' }));
          }
        });
      }
    } catch (err) {
      console.error('サービス注文データ取得エラー（静かな更新）:', err);
    }
  };

  const loadMenuData = async () => {
    try {
      setIsMenuLoading(true);
      
      // カテゴリと商品を並行して取得
      const [categoriesResponse, productsResponse] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products')
      ]);
      
      const categoriesResult = await categoriesResponse.json();
      const productsResult = await productsResponse.json();
      
      if (categoriesResult.success && productsResult.success) {
        setMenuCategories(categoriesResult.categories);
        setMenuItems(productsResult.products.filter((p: any) => Number(p.amount) > 0));
      } else {
        error('エラー', 'メニューデータの取得に失敗しました');
      }
    } catch (err) {
      console.error('メニューデータ取得エラー:', err);
      error('エラー', 'メニューデータの取得に失敗しました');
    } finally {
      setIsMenuLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      setIsServicesLoading(true);
      
      const response = await fetch('/api/services');
      const result = await response.json();
      
      if (result.success) {
        setServices(result.services);
      } else {
        error('エラー', 'サービスデータの取得に失敗しました');
      }
    } catch (err) {
      console.error('サービスデータ取得エラー:', err);
      error('エラー', 'サービスデータの取得に失敗しました');
    } finally {
      setIsServicesLoading(false);
    }
  };

  const addToCart = (menuItem: any) => {
    setSelectedProduct(menuItem);
    setOrderQuantity(1);
    setSelectedCast('none');
    setShowOrderDialog(true);
    loadCasts(); // キャスト一覧を読み込み
  };

  const handleOrderSubmit = async () => {
    if (!selectedProduct || !tableAuth) return;

    try {
      // ローカルストレージからセッションIDを取得
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) {
        error('エラー', 'セッションが見つかりません');
        return;
      }

      const response = await fetch('/api/salesorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cast_id: selectedCast && selectedCast !== 'none' ? selectedCast : null,
          product_id: selectedProduct.id,
          amount: orderQuantity,
          table_id: parseInt(tableAuth.table_id),
          session_id: parseInt(sessionId)
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('注文完了', '注文が確定されました');
        setShowOrderDialog(false);
        setSelectedProduct(null);
        setOrderQuantity(1);
        setSelectedCast('none');
        loadCartOrders(); // カートを更新
        
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
              table_id: parseInt(tableAuth.table_id),
              table_label: tableAuth.table_label,
              cast_name: selectedCast && selectedCast !== 'none' ? 
                casts.find(c => c.id.toString() === selectedCast)?.name || '未選択' : '未選択',
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

  // sendOrderRequest関数は削除（order_requestsテーブルが削除されたため）
  // 注文確定時に即座に管理者に送信される

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
    setCartOrders(prev => {
      const newOrders = prev.filter(order => order.id.toString() !== orderId);
      const sessionId = localStorage.getItem('current_session_id');
      if (sessionId) {
        localStorage.setItem(`cart_orders_${sessionId}`, JSON.stringify(newOrders));
      }
      return newOrders;
    });
    setCountdownTimers(prev => {
        const newTimers = { ...prev } as any;
      delete newTimers[orderId];
      return newTimers;
    });
    setOrderRequestStatus(prev => {
        const newStatus = { ...prev } as any;
      delete newStatus[orderId];
      return newStatus;
    });
      success('削除完了', '承認待ちの注文を削除しました');
    } catch (e: any) {
      console.error('削除エラー:', e);
      error('エラー', e?.message || '注文の削除に失敗しました');
    }
  };

  const handleServiceOrder = (service: any) => {
    setSelectedService(service);
    setServiceOrderQuantity(1);
    setSelectedServiceCast('none');
    setShowServiceOrderDialog(true);
    loadCasts();
  };

  const handleServiceOrderSubmit = async () => {
    if (!selectedService || !tableAuth) return;

    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) {
        error('エラー', 'セッションが見つかりません');
        return;
      }

      const response = await fetch('/api/serviceorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cast_id: selectedServiceCast && selectedServiceCast !== 'none' ? selectedServiceCast : null,
          service_id: selectedService.id,
          amount: serviceOrderQuantity,
          table_id: parseInt(tableAuth.table_id),
          session_id: parseInt(sessionId)
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('サービス注文完了', 'サービス注文が確定されました');
        setShowServiceOrderDialog(false);
        setSelectedService(null);
        setServiceOrderQuantity(1);
        setSelectedServiceCast('none');
        loadServiceOrders(); // サービス注文を更新
        
        // 即座に送信済みステータスに設定
        if (result.data && result.data.id) {
          setServiceRequestStatus(prev => ({ ...prev, [result.data.id]: 'sent' }));
        }

        // 管理者に通知を送信
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'service_order',
              table_id: parseInt(tableAuth.table_id),
              table_label: tableAuth.table_label,
              cast_name: selectedServiceCast && selectedServiceCast !== 'none' ? 
                casts.find(c => c.id.toString() === selectedServiceCast)?.name || '未選択' : '未選択',
              message: `${selectedService.name} x${serviceOrderQuantity} のサービス注文が入りました`,
              priority: 'high'
            }),
          });
        } catch (notificationError) {
          console.error('通知送信エラー:', notificationError);
        }
      } else {
        error('エラー', result.error || 'サービス注文の確定に失敗しました');
      }
    } catch (err) {
      console.error('サービス注文エラー:', err);
      error('エラー', 'サービス注文の確定に失敗しました');
    }
  };

  const removeFromServiceOrders = (orderId: string) => {
    setServiceOrders(prev => {
      const newOrders = prev.filter(order => order.id.toString() !== orderId);
      // ローカルストレージも更新
      const sessionId = localStorage.getItem('current_session_id');
      if (sessionId) {
        localStorage.setItem(`service_orders_${sessionId}`, JSON.stringify(newOrders));
      }
      return newOrders;
    });
    setServiceRequestStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[orderId];
      return newStatus;
    });
  };





  const startSession = async () => {
    if (!tableAuth) return;
    
    try {
      // データベースにセッションを作成
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: parseInt(tableAuth.table_id),
          cost: 0,
          cast_id: null,
          nomination_type: 'main'
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'セッション作成に失敗しました');
      }

      // ローカルストレージにcurrent_session_idを保存
      localStorage.setItem('current_session_id', result.data.id.toString());
      
      // 支払い状態をリセット
      setIsPaymentCompleted(false);
      localStorage.removeItem('payment_completed');
      
      await startTableSession(tableAuth.table_id);
      setIsSessionActive(true);
      success('セッション開始', 'セッションを開始しました');
    } catch (err) {
      console.error('セッション開始エラー:', err);
      error('エラー', 'セッション開始に失敗しました');
    }
  };

  const endSession = async () => {
    if (!tableAuth) return;
    
    // nomination_typeが存在しない場合は指名選択を求める
    const nominationType = localStorage.getItem('nomination_type');
    if (!nominationType) {
      setShowNominationRequiredDialog(true);
      return;
    }
    
    confirm(
      'セッション終了',
      'セッションを終了しますか？',
      async () => {
        try {
          const sessionId = localStorage.getItem('current_session_id');
          const cost = localStorage.getItem('cost');
          const endAt = new Date().toISOString();
          
          if (sessionId) {
            // データベースにセッション終了情報を保存
            const response = await fetch(`/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cost: cost ? parseFloat(cost) : 0,
                end_at: endAt
              }),
            });

            const result = await response.json();
            if (!result.success) {
              throw new Error(result.error || 'セッション終了情報の保存に失敗しました');
            }
          }

          // ローカルストレージを初期化
          if (sessionId) {
            localStorage.removeItem(`cart_orders_${sessionId}`);
            localStorage.removeItem(`service_orders_${sessionId}`);
          }
          localStorage.removeItem('current_session_id');
          localStorage.removeItem('nomination_type');
          localStorage.removeItem('service_orders');
          localStorage.removeItem('cart_orders');
          localStorage.removeItem('cost');
          localStorage.removeItem('payment_completed');
          
          // テーブルセッションを終了
          await endTableSession(tableAuth.table_id);
          setIsSessionActive(false);
          
          // 状態をリセット
          setCartOrders([]);
          setCountdownTimers({});
          setOrderRequestStatus({});
          setServiceOrders([]);
          setServiceRequestStatus({});
          setIsPaymentCompleted(false);
          setCurrentNominationType(null);
          
          success('セッション終了', 'セッションを終了しました');
        } catch (err) {
          console.error('セッション終了エラー:', err);
          error('エラー', `セッション終了に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
        }
      }
    );
  };

  const calculateTotal = () => {
    if (!cartOrders || cartOrders.length === 0) {
      return 0;
    }
    
    const total = cartOrders.reduce((total, order) => {
      // 承認された商品のみを合計に含める
      const status = orderRequestStatus[order.id] || order.status;
      if (status === 'accepted') {
        const price = Number(order.total_price);
        const validPrice = isNaN(price) ? 0 : price;
        return total + validPrice;
      }
      return total;
    }, 0);
    
    return total;
  };

  const calculateCastBack = () => {
    return cartOrders.reduce((total, order) => {
      if (!order.cast_id) return total;
      
      // For now, return 0 as we don't have back calculation for the new system
      // This can be implemented later if needed
      return total;
    }, 0);
  };

  // 支払い処理
  const handlePayment = () => {
    const totalAmount = calculateTotal();
    
    if (totalAmount <= 0) {
      const acceptedOrders = cartOrders.filter(order => {
        const status = orderRequestStatus[order.id] || order.status;
        return status === 'accepted';
      });
      
      if (acceptedOrders.length === 0) {
        error('エラー', '承認された商品がありません。管理者による承認をお待ちください。');
      } else {
        error('エラー', '承認された商品の金額が0円です。商品の価格を確認してください。');
      }
      return;
    }
    
    if (totalAmount < 50) {
      error('エラー', '最小支払い金額は50円です');
      return;
    }
    
    setPaymentAmount(totalAmount);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    // 支払い完了後、ローカルストレージのcost項目に保存
    const currentCost = localStorage.getItem('cost') || '0';
    const newCost = parseInt(currentCost) + paymentAmount;
    localStorage.setItem('cost', newCost.toString());
    
    // 支払い完了状態を設定
    setIsPaymentCompleted(true);
    localStorage.setItem('payment_completed', 'true');
    
    // sessionsテーブルも更新
    const sessionId = localStorage.getItem('current_session_id');
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cost: newCost
        }),
      }).catch(err => console.error('セッション更新エラー:', err));
    }
    
    // 承認待ち（pending/sent）の注文は決済完了時に拒否へ更新
    try {
      const ordersToReject = cartOrders.filter((order: any) => {
        const st = (orderRequestStatus as any)[order.id] || order.status;
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
      // ローカル状態も反映
      setOrderRequestStatus(prev => {
        const next: any = { ...prev };
        ordersToReject.forEach((o: any) => { next[o.id] = 'rejected'; });
        return next;
      });
      // 最新データを取得
      await loadCartOrders();
    } catch (e) {
      console.error('決済後の注文更新処理エラー:', e);
    }
    
    success('支払い完了', `${paymentAmount.toLocaleString()}円の支払いが完了しました`);
    setShowPaymentDialog(false);
    setPaymentAmount(0);
  };

  const handlePaymentError = (errorMessage: string) => {
    error('支払いエラー', errorMessage);
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
    setPaymentAmount(0);
  };

  const handleNomination = async () => {
    // 指名の場合はキャスト選択が必要
    setSelectedMenuItem({ type: 'nomination' });
    setShowCastSelection(true);
  };

  const handleNominationCastSelection = async (castId: string, castName: string) => {
    if (!selectedMenuItem || !tableAuth) return;

    try {
      await createNomination(
        tableAuth.table_id,
        castId,
        castName,
        selectedMenuItem.nominationType,
        selectedMenuItem.amount
      );

      success('指名登録完了', `${getNominationTypeLabel(selectedMenuItem.nominationType)}を登録しました（担当: ${castName}）`);
      setShowNominationDialog(false);
      setNominationAmount('');
      setSelectedNominationType(null);
    } catch (err) {
      error('エラー', '指名の登録に失敗しました');
    }

    setShowCastSelection(false);
    setSelectedMenuItem(null);
  };

  const handleFieldNomination = async () => {
    if (!fieldNominationCast || !tableAuth) {
      error('エラー', '場内指名するキャストを選択してください');
      return;
    }

    const selectedCast = availableCasts.find(cast => cast.id === fieldNominationCast);
    if (!selectedCast) {
      error('エラー', '選択されたキャストが見つかりません');
      return;
    }

    try {
      // 場内指名の場合は金額を0円で登録（実際の売上は注文で発生）
      await createNomination(
        tableAuth.table_id,
        fieldNominationCast,
        selectedCast.name,
        'field_nomination',
        0
      );

      success('場内指名完了', `${selectedCast.name}を場内指名しました`);
      setShowFieldNominationDialog(false);
      setFieldNominationCast('');
    } catch (err) {
      error('エラー', '場内指名に失敗しました');
    }
  };

  const handleNominationTypeSelection = async (nominationType: 'main' | 'field') => {
    if (!selectedCastForNomination || !tableAuth) return;

    try {
      const nominationTypeForAPI = nominationType === 'main' ? 'nomination' : 'field_nomination';
      
      await createNomination(
        tableAuth.table_id,
        selectedCastForNomination.id,
        selectedCastForNomination.name,
        nominationTypeForAPI,
        0
      );

      const typeLabel = nominationType === 'main' ? '本指名' : '場内指名';
      success('指名完了', `${selectedCastForNomination.name}を${typeLabel}しました`);
      
      setShowNominationTypeDialog(false);
      setSelectedCastForNomination(null);
    } catch (err) {
      error('エラー', '指名に失敗しました');
    }
  };

  const handleNominationCastConfirm = async () => {
    if (!selectedNominationCast || !currentNominationType || !tableAuth) return;

    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) {
        error('エラー', 'セッションIDが見つかりません');
        return;
      }

      // sessionsテーブルを更新
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cast_id: parseInt(selectedNominationCast),
          nomination_type: currentNominationType
        }),
      });

      if (!response.ok) {
        throw new Error('セッションの更新に失敗しました');
      }

      const selectedCast = availableCasts.find(cast => cast.id.toString() === selectedNominationCast);
      const typeLabel = currentNominationType === 'main' ? '本指名' : '場内指名';
      
      success('指名完了', `${selectedCast?.name}を${typeLabel}しました`);
      
      setShowNominationCastDialog(false);
      setSelectedNominationCast('');
      // currentNominationTypeは保持してチェックマークを表示
    } catch (err) {
      console.error('指名エラー:', err);
      error('エラー', '指名に失敗しました');
    }
  };


  const handleStaffCall = async (callType: 'service' | 'manager' | 'security' | 'emergency', message: string) => {
    if (!tableAuth) {
      error('エラー', 'テーブル情報が見つかりません');
      return;
    }

    try {
      await createStaffCall(
        tableAuth.table_id,
        tableAuth.table_label,
        callType,
        message,
        callType === 'emergency' ? 'urgent' : 'medium'
      );

      // スタッフ呼び出し通知を作成
      await createOrderNotification(
        tableAuth.table_id,
        tableAuth.table_label,
        'staff_call',
        message,
        callType === 'emergency' ? 'urgent' : 'high',
        1
      );

      success('呼び出し完了', 'スタッフに通知されました');
    } catch (err) {
      error('エラー', '呼び出しに失敗しました');
    }
  };

  const handleManagerCall = async () => {
    try {
      // キャスト一覧を取得
      const response = await fetch('/api/casts');
      const result = await response.json();
      
      if (result.success) {
        setAvailableCasts(result.data);
        setShowManagerCallDialog(true);
      } else {
        error('エラー', 'キャスト一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('キャスト取得エラー:', err);
      error('エラー', 'キャスト一覧の取得に失敗しました');
    }
  };

  const handleManagerCallSubmit = async () => {
    if (!selectedCastForManagerCall || !tableAuth || !isSessionActive) {
      error('エラー', 'キャストを選択してください');
      return;
    }

    try {
      // 現在のセッションIDを取得
      const currentSessionId = localStorage.getItem('current_session_id');
      if (!currentSessionId) {
        error('エラー', 'セッション情報が見つかりません');
        return;
      }

      // callmanagerテーブルにデータを保存
      const response = await fetch('/api/callmanager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cast_id: selectedCastForManagerCall.id,
          table_id: tableAuth.table_id,
          session_id: parseInt(currentSessionId),
          calltype: 'manager'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('店長呼び出し完了', '管理者に通知されました');
        setShowManagerCallDialog(false);
        setSelectedCastForManagerCall(null);
        setManagerCallStatus('pending');
        
        // 管理者ダッシュボードに通知を送信
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'manager_call',
              table_id: tableAuth.table_id,
              table_label: tableAuth.table_label,
              cast_name: selectedCastForManagerCall.name,
              message: '店長呼び出しリクエストが送信されました',
              priority: 'high'
            }),
          });
        } catch (notificationError) {
          console.error('通知送信エラー:', notificationError);
        }
      } else {
        error('エラー', result.error || '店長呼び出しに失敗しました');
      }
    } catch (err) {
      console.error('店長呼び出しエラー:', err);
      error('エラー', '店長呼び出しに失敗しました');
    }
  };

  const loadManagerCallStatus = async () => {
    if (!tableAuth || !isSessionActive) return;

    try {
      const currentSessionId = localStorage.getItem('current_session_id');
      if (!currentSessionId) return;

      const response = await fetch(`/api/callmanager?table_id=${tableAuth.table_id}&session_id=${currentSessionId}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const latestCall = result.data[0];
        const newStatus = latestCall.status;
        
        // ステータスが変更された場合のみ状態を更新（通知は表示しない）
        if (previousManagerCallStatus !== newStatus) {
          setPreviousManagerCallStatus(newStatus);
        }
        
        setManagerCallStatus(newStatus);
      } else {
        const newStatus = 'none';
        if (previousManagerCallStatus !== newStatus) {
          setPreviousManagerCallStatus(newStatus);
        }
        setManagerCallStatus(newStatus);
      }
    } catch (err) {
      console.error('店長呼び出し状態確認エラー:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tableAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセスエラー</h1>
          <p className="text-gray-600">テーブル情報を取得できませんでした</p>
        </div>
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
                onClick={() => router.push('/')}
                className="self-start sm:self-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{tableAuth.table_label}</h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {tableAuth.area} • {tableAuth.capacity}名
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Badge 
                variant={isSessionActive ? 'default' : 'outline'}
                className={`${isSessionActive ? 'bg-green-100 text-green-800' : ''} text-xs sm:text-sm`}
              >
                {isSessionActive ? 'セッション中' : '待機中'}
              </Badge>
              {isSessionActive && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={endSession}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  セッション終了
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メニュー選択 */}
          <div className="lg:col-span-2 space-y-6">
            {/* セッション管理 */}
            {!isSessionActive && (
              <Card className="bg-blue-50 border-blue-200 col-span-10">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    セッション開始
                  </CardTitle>
                  <CardDescription>
                    セッションを開始してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      onClick={startSession}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      セッション開始
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* メニューカテゴリ */}
            {isSessionActive && (
              <div className="space-y-6">
                {isOrderingLocked && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-none">
                    支払いが確認されたため、商品の追加はできません。
                  </div>
                )}
                {isMenuLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">メニューを読み込み中...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 製品リスト（カード＋カテゴリ選択＋表） */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center">
                          <Wine className="w-5 h-5 mr-2" />
                          メニュー
                        </CardTitle>
                        <CardDescription>
                          カテゴリを選択して製品一覧を表示
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3 mb-3">
                          <Label className="text-sm text-gray-600">カテゴリ</Label>
                          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder="カテゴリを選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">すべて</SelectItem>
                              {menuCategories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <ScrollArea className="h-[40vh] pr-1">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40%]">商品名</TableHead>
                                <TableHead className="w-[20%]">価格</TableHead>
                                <TableHead className="w-[20%]">SKU</TableHead>
                                <TableHead className="w-[20%] text-right">アクション</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                const items = selectedCategoryId === 'all'
                                  ? menuItems
                                  : menuItems.filter((it: any) => Number(it.category_id) === Number(selectedCategoryId));
                                if (!items || items.length === 0) {
                                  return (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center text-sm text-gray-500">
                                        該当する商品がありません
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                                return items.map((item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{item.name}</span>
                                  {item.other && (
                                          <span className="text-xs text-gray-500 truncate">{item.other}</span>
                                  )}
                                </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{formatCurrency(item.sale_price)}</TableCell>
                                    <TableCell>
                                      {item.sku ? (
                                        <Badge variant="outline" className="text-[10px] py-0 px-1">{item.sku}</Badge>
                                      ) : (
                                        <span className="text-gray-300 text-xs">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                <Button 
                                  size="sm"
                                        onClick={() => { if (!isOrderingLocked) addToCart(item); }}
                                        disabled={isOrderingLocked}
                                        className={`${isOrderingLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                        <Plus className="w-4 h-4 mr-1" /> 追加
                                </Button>
                                    </TableCell>
                                  </TableRow>
                                ));
                              })()}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* サービスリスト（注文） */}
                    <ScrollArea className="h-[40vh] pr-1">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center">
                            <Users className="w-5 h-5 mr-2" />
                            サービス・呼び出し
                          </CardTitle>
                          <CardDescription>
                            サービスの注文と店長呼び出し
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* サービス注文ボタン */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">サービス注文</h4>
                              {isServicesLoading ? (
                                <div className="text-center py-4">
                                  <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">サービスを読み込み中...</p>
                              </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  {services.map((service, index) => {
                                    const colors = [
                                      'text-green-700 border-green-300 hover:bg-green-50',
                                      'text-orange-700 border-orange-300 hover:bg-orange-50',
                                      'text-blue-700 border-blue-300 hover:bg-blue-50',
                                      'text-purple-700 border-purple-300 hover:bg-purple-50',
                                      'text-teal-700 border-teal-300 hover:bg-teal-50',
                                      'text-pink-700 border-pink-300 hover:bg-pink-50'
                                    ];
                                    const colorClass = colors[index % colors.length];
                                    return (
                                      <Button 
                                        key={service.id}
                                        variant="outline"
                                        onClick={() => handleServiceOrder(service)}
                                        className={colorClass}
                                      >
                                        {service.name}
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* スタッフ呼び出し（店長） */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">スタッフ呼び出し</h4>
                              <Button 
                                variant="outline"
                                onClick={() => handleManagerCall()}
                                className={`${
                                  managerCallStatus === 'accepted' 
                                    ? 'text-green-700 border-green-300 bg-green-50' 
                                    : managerCallStatus === 'rejected'
                                    ? 'text-red-700 border-red-300 bg-red-50'
                                    : managerCallStatus === 'pending'
                                    ? 'text-yellow-700 border-yellow-300 bg-yellow-50'
                                    : 'text-red-700 border-red-300 hover:bg-red-50'
                                }`}
                                disabled={managerCallStatus === 'pending' || managerCallStatus === 'accepted' || managerCallStatus === 'rejected'}
                              >
                                <div className="flex items-center space-x-2">
                                  {managerCallStatus === 'accepted' && <CheckCircle className="w-4 h-4" />}
                                  {managerCallStatus === 'rejected' && <XCircle className="w-4 h-4" />}
                                  {managerCallStatus === 'pending' && <Clock className="w-4 h-4" />}
                                  <span>
                                    {managerCallStatus === 'accepted' ? '受理済み' : 
                                      managerCallStatus === 'rejected' ? '拒否済み' : 
                                      managerCallStatus === 'pending' ? '処理中' : 
                                      '店長呼び出し'}
                                  </span>
                                </div>
                              </Button>
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* カート・注文 */}
          {isSessionActive && (
            <div className="space-y-6">
            {/* 注文カート */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  注文カート
                </CardTitle>
                <CardDescription>
                  {cartOrders.length}個の商品
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cartOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>カートが空です</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[30vh] pr-1">
                  <div className="space-y-3">
                    {cartOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{order.product_name}</h4>
                          <p className="text-xs text-gray-500">
                            ¥{order.unit_price?.toLocaleString()} × {order.amount}個
                            {order.cast_name ? (
                              <span className="ml-2 text-blue-600">
                                (担当: {order.cast_name})
                              </span>
                            ) : (
                              <span className="ml-2 text-gray-500">
                                (お客様直接注文)
                              </span>
                            )}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className="text-sm font-bold text-blue-600">
                              合計: ¥{order.total_price?.toLocaleString()}
                            </span>
                            {orderRequestStatus[order.id] === 'sent' && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">
                                (管理者に送信済み)
                              </span>
                            )}
                            {orderRequestStatus[order.id] === 'accepted' && (
                              <span className="ml-2 text-xs text-green-600 font-medium">
                                (管理者が受付済み)
                              </span>
                            )}
                            {(orderRequestStatus[order.id] as string) === 'rejected' && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                (管理者が拒否)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* 注文リクエスト状態アイコン */}
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
                            {/* 削除ボタン（承認待ちのみ表示） */}
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
              </CardContent>
            </Card>

            {/* 合計・注文 */}
            {cartOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    注文合計
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 承認状況の表示 */}
                  {(() => {
                    const acceptedOrders = cartOrders.filter(order => {
                      const status = orderRequestStatus[order.id] || order.status;
                      return status === 'accepted';
                    });
                    const pendingOrders = cartOrders.filter(order => {
                      const status = orderRequestStatus[order.id] || order.status;
                      return status === 'pending' || status === 'sent';
                    });
                    
                    return (
                      <div className="bg-blue-50 rounded-lg p-3 text-sm">
                        {/* <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-blue-900">承認状況</span>
                        </div> */}
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-blue-700">承認済み商品:</span>
                            <span className="font-medium text-blue-900">{acceptedOrders.length}件</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">承認待ち商品:</span>
                            <span className="font-medium text-orange-600">{pendingOrders.length}件</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="space-y-2">
                    {/* <div className="flex justify-between">
                      <span>小計（承認済み商品のみ）</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>キャストバック</span>
                      <span className="text-green-600 font-medium">{formatBackAmount(calculateCastBack())}</span>
                    </div> */}
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>合計</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {(() => {
                      const acceptedOrders = cartOrders.filter(order => {
                        const status = orderRequestStatus[order.id] || order.status;
                        return status === 'accepted';
                      });
                      const hasAcceptedOrders = acceptedOrders.length > 0;
                      
                      return isPaymentCompleted && hasAcceptedOrders ? (
                        <div className="w-full bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center space-x-2 text-green-700">
                            <CheckCircle className="w-6 h-6" />
                            <span className="font-bold text-lg">支払い確認済み</span>
                          </div>
                          <div className="text-sm text-green-600 mt-1">
                            支払いが完了しました
                          </div>
                        </div>
                      ) : (
                        <Button 
                          onClick={handlePayment}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          size="lg"
                          disabled={calculateTotal() <= 0 || isNaN(calculateTotal())}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          支払い確定 ({formatCurrency(calculateTotal())})
                        </Button>
                      );
                    })()}
                    

                  </div>
                </CardContent>
              </Card>
            )}

            {/* サービス注文カート */}
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
                  <div className="text-center py-8 text-gray-500">
                    <Utensils className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>サービス注文がありません</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[24vh] pr-1">
                  <div className="space-y-3">
                    {serviceOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{order.service_name}</h4>
                          <p className="text-xs text-gray-500">
                            数量: {order.amount}個
                            {order.cast_name ? (
                              <span className="ml-2 text-blue-600">
                                (担当: {order.cast_name})
                              </span>
                            ) : (
                              <span className="ml-2 text-gray-500">
                                (お客様直接注文)
                              </span>
                            )}
                          </p>
                          <div className="flex items-center mt-1">
                            {serviceRequestStatus[order.id] === 'sent' && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">
                                (管理者に送信済み)
                              </span>
                            )}
                            {serviceRequestStatus[order.id] === 'accepted' && (
                              <span className="ml-2 text-xs text-green-600 font-medium">
                                (管理者が受付済み)
                              </span>
                            )}
                            {(serviceRequestStatus[order.id] as string) === 'rejected' && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                (管理者が拒否)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* サービス注文リクエスト状態アイコン */}
                          <div className="relative">
                            {serviceRequestStatus[order.id] === 'pending' && (
                              <div className="w-6 h-6 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
                              </div>
                            )}
                            {serviceRequestStatus[order.id] === 'sent' && (
                              <div className="w-6 h-6 flex items-center justify-center">
                                <Bell className="w-4 h-4 text-blue-500 animate-bounce" />
                              </div>
                            )}
                            {serviceRequestStatus[order.id] === 'accepted' && (
                              <div className="w-6 h-6 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </div>
                            )}
                            {(serviceRequestStatus[order.id] as string) === 'rejected' && (
                              <div className="w-6 h-6 flex items-center justify-center">
                                <X className="w-4 h-4 text-red-500" />
                              </div>
                            )}
                          </div>
                          
                          {/* 削除ボタン */}
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

            {/* 指名機能（常時表示） */}
            {isSessionActive && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    指名
                  </CardTitle>
                  <CardDescription>
                    キャストを指名して接客を依頼できます
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCurrentNominationType('main');
                        localStorage.setItem('nomination_type', 'main');
                        setShowNominationCastDialog(true);
                      }}
                      className="text-purple-700 border-purple-300 hover:bg-purple-50 h-16 flex-col space-y-1"
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-medium">本指名</span>
                      {currentNominationType === 'main' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCurrentNominationType('inside');
                        localStorage.setItem('nomination_type', 'inside');
                        setShowNominationCastDialog(true);
                      }}
                      className="text-blue-700 border-blue-300 hover:bg-blue-50 h-16 flex-col space-y-1"
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-medium">場内指名</span>
                      {currentNominationType === 'inside' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* サービス・呼び出しカードは左カラムへ移動済み */}

          </div>
          )}
        </div>

        {/* サービス注文ダイアログ */}
        <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                サービス注文
              </DialogTitle>
              <DialogDescription>
                {getServiceTypeLabel(serviceType)}を注文します
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* サービスタイプ選択 */}
              <div className="space-y-2">
                <Label>サービスタイプ</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={serviceType === 'towel' ? 'default' : 'outline'}
                    onClick={() => setServiceType('towel')}
                    className="text-green-700 border-green-300 hover:bg-green-50"
                  >
                    おしぼり
                  </Button>
                  <Button
                    variant={serviceType === 'ashtray' ? 'default' : 'outline'}
                    onClick={() => setServiceType('ashtray')}
                    className="text-orange-700 border-orange-300 hover:bg-orange-50"
                  >
                    灰皿交換
                  </Button>
                  <Button
                    variant={serviceType === 'glass' ? 'default' : 'outline'}
                    onClick={() => setServiceType('glass')}
                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    グラス
                  </Button>
                  <Button
                    variant={serviceType === 'chopsticks' ? 'default' : 'outline'}
                    onClick={() => setServiceType('chopsticks')}
                    className="text-purple-700 border-purple-300 hover:bg-purple-50"
                  >
                    お箸
                  </Button>
                </div>
              </div>

              {/* 数量入力 */}
              <div className="space-y-2">
                <Label htmlFor="service-quantity">数量</Label>
                <Input
                  id="service-quantity"
                  type="number"
                  min="1"
                  value={serviceQuantity}
                  onChange={(e) => setServiceQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* メモ入力 */}
              <div className="space-y-2">
                <Label htmlFor="service-note">メモ（任意）</Label>
                <Input
                  id="service-note"
                  placeholder="特記事項があれば入力してください"
                  value={serviceNote}
                  onChange={(e) => setServiceNote(e.target.value)}
                />
              </div>
              
              {/* 注文情報表示 */}
              <div className="bg-gray-50 rounded-none p-4">
                <h4 className="font-medium text-gray-900 mb-2">注文情報</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>テーブル:</span>
                    <span>{tableAuth?.table_label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>サービス:</span>
                    <span>{getServiceTypeLabel(serviceType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>数量:</span>
                    <span>{serviceQuantity}個</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowServiceDialog(false);
                setServiceQuantity(1);
                setServiceNote('');
              }}>
                キャンセル
              </Button>
              <Button onClick={handleServiceOrderSubmit}>
                注文
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 指名ダイアログ */}
        <Dialog open={showNominationDialog} onOpenChange={setShowNominationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                {selectedNominationType ? getNominationTypeLabel(selectedNominationType) : '指名'}登録
              </DialogTitle>
              <DialogDescription>
                指名を登録します（キャストを選択してください）
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* 指名タイプ選択 */}
              <div className="space-y-2">
                <Label>指名タイプ</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedNominationType === 'nomination' ? 'default' : 'outline'}
                    onClick={() => setSelectedNominationType('nomination')}
                    className="text-purple-700 border-purple-300 hover:bg-purple-50"
                  >
                    本指名
                  </Button>
                  <Button
                    variant={selectedNominationType === 'field_nomination' ? 'default' : 'outline'}
                    onClick={() => setSelectedNominationType('field_nomination')}
                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    場内指名
                  </Button>
                </div>
              </div>

              {/* 指名金額入力 */}
              <div className="space-y-2">
                <Label htmlFor="nomination-amount">指名金額</Label>
                <Input
                  id="nomination-amount"
                  type="number"
                  placeholder="金額を入力"
                  value={nominationAmount}
                  onChange={(e) => setNominationAmount(e.target.value)}
                />
              </div>
              
              {/* 指名情報表示 */}
              <div className="bg-gray-50 rounded-none p-4">
                <h4 className="font-medium text-gray-900 mb-2">指名情報</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>指名タイプ:</span>
                    <span>{selectedNominationType ? getNominationTypeLabel(selectedNominationType) : '未選択'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>テーブル:</span>
                    <span>{tableAuth?.table_label}</span>
                  </div>
                  {selectedNominationType && (
                    <div className="flex justify-between">
                      <span>バック率:</span>
                      <span className="text-green-600 font-medium">
                        {selectedNominationType === 'nomination' ? '15%' : '8%'} (管理者設定)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowNominationDialog(false);
                setSelectedNominationType(null);
                setNominationAmount('');
              }}>
                キャンセル
              </Button>
              <Button 
                onClick={handleNomination}
                disabled={!selectedNominationType || !nominationAmount}
              >
                キャスト選択へ
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 場内指名ダイアログ */}
        <Dialog open={showFieldNominationDialog} onOpenChange={setShowFieldNominationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                場内指名
              </DialogTitle>
              <DialogDescription>
                場内で指名するキャストを選択してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>指名するキャスト</Label>
                <Select value={fieldNominationCast} onValueChange={setFieldNominationCast}>
                  <SelectTrigger>
                    <SelectValue placeholder="キャストを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCasts.map((cast) => (
                      <SelectItem key={cast.id} value={cast.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{cast.name}</span>
                          <Badge variant="outline" className="text-xs ml-2">
                            空き
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 場内指名情報表示 */}
              <div className="bg-gray-50 rounded-none p-4">
                <h4 className="font-medium text-gray-900 mb-2">場内指名情報</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>テーブル:</span>
                    <span>{tableAuth?.table_label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>指名タイプ:</span>
                    <span>場内指名</span>
                  </div>
                  <div className="flex justify-between">
                    <span>バック率:</span>
                    <span className="text-green-600 font-medium">8% (管理者設定)</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    ※ 場内指名後は、そのキャストがメインで接客を担当します
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowFieldNominationDialog(false);
                setFieldNominationCast('');
              }}>
                キャンセル
              </Button>
              <Button 
                onClick={handleFieldNomination}
                disabled={!fieldNominationCast}
              >
                場内指名
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 指名タイプ選択ダイアログ */}
        <Dialog open={showNominationTypeDialog} onOpenChange={setShowNominationTypeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                指名タイプ選択
              </DialogTitle>
              <DialogDescription>
                {selectedCastForNomination?.name}の指名タイプを選択してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => handleNominationTypeSelection('field')}
                  className="flex items-center justify-between p-4 h-auto bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium">場内指名</h4>
                      <p className="text-sm text-gray-500">その場で指名する</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    場内
                  </Badge>
                </Button>

                <Button
                  onClick={() => handleNominationTypeSelection('main')}
                  className="flex items-center justify-between p-4 h-auto bg-purple-50 hover:bg-purple-100 border-purple-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium">本指名</h4>
                      <p className="text-sm text-gray-500">事前に指名する</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    本指名
                  </Badge>
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowNominationTypeDialog(false);
                setSelectedCastForNomination(null);
              }}>
                キャンセル
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* キャスト選択ダイアログ */}
        <Dialog open={showCastSelection} onOpenChange={setShowCastSelection}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                キャスト選択
              </DialogTitle>
               <DialogDescription>
                 {selectedMenuItem?.type === 'nomination' 
                   ? '指名するキャストを選択してください'
                   : selectedMenuItem?.type === 'menu'
                   ? `${selectedMenuItem?.name}の担当キャストを選択してください（任意）`
                   : `${selectedMenuItem?.name}の担当キャストを選択してください（指名の場合は必須）`
                 }
               </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
               <div className="grid grid-cols-1 gap-3">
                 {availableCasts.map((cast) => (
                   <Button
                     key={cast.id}
                     variant="outline"
                     onClick={() => {
                       if (selectedMenuItem?.type === 'nomination') {
                         handleNominationCastSelection(cast.id, cast.name);
                       } else {
                         // Cast selection for new order system - for now just close dialog
                         setShowCastSelection(false);
                         setSelectedMenuItem(null);
                       }
                     }}
                     className="flex items-center justify-between p-4 h-auto"
                   >
                     <div className="flex items-center space-x-3">
                       <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                         <Users className="w-5 h-5 text-pink-600" />
                       </div>
                       <div className="text-left">
                         <h4 className="font-medium">{cast.name}</h4>
                         <p className="text-sm text-gray-500">キャスト</p>
                       </div>
                     </div>
                     <Badge variant="outline" className="bg-green-50 text-green-700">
                       空き
                     </Badge>
                   </Button>
                 ))}
               </div>
               
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowCastSelection(false);
                setSelectedMenuItem(null);
              }}>
                キャンセル
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 注文モーダル */}
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
                    <p className="text-sm text-gray-500">SKU: {selectedProduct?.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">
                      ¥{selectedProduct?.sale_price?.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">在庫: {selectedProduct?.amount}個</p>
                  </div>
                </div>
              </div>

              {/* キャスト選択 */}
              <div className="space-y-2">
                <Label htmlFor="cast-select">担当キャスト（任意）</Label>
                <Select value={selectedCast} onValueChange={setSelectedCast}>
                  <SelectTrigger>
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
                  最大: {selectedProduct?.amount}個
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
                  setSelectedCast('none');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleOrderSubmit}
                disabled={!selectedProduct || orderQuantity < 1 || isOrderingLocked}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                注文確定
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* サービス注文モーダル */}
        <Dialog open={showServiceOrderDialog} onOpenChange={setShowServiceOrderDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Utensils className="w-5 h-5 mr-2" />
                サービス注文
              </DialogTitle>
              <DialogDescription>
                サービスを注文します
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 選択されたサービス情報 */}
              {selectedService && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{selectedService.name}</h4>
                  <p className="text-sm text-gray-600">{selectedService.description}</p>
                </div>
              )}

              {/* キャスト選択 */}
              <div className="space-y-2">
                <Label htmlFor="service-cast-select">担当キャスト（任意）</Label>
                <Select value={selectedServiceCast} onValueChange={setSelectedServiceCast}>
                  <SelectTrigger>
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

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowServiceOrderDialog(false);
                  setSelectedService(null);
                  setServiceOrderQuantity(1);
                  setSelectedServiceCast('none');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleServiceOrderSubmit}
                disabled={!selectedService || serviceOrderQuantity < 1}
                className="bg-green-600 hover:bg-green-700"
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
                {currentNominationType === 'main' ? '本指名' : '場内指名'} - キャスト選択
              </DialogTitle>
              <DialogDescription>
                指名するキャストを選択してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>キャスト選択</Label>
                <Select value={selectedNominationCast} onValueChange={setSelectedNominationCast}>
                  <SelectTrigger>
                    <SelectValue placeholder="キャストを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCasts.map((cast) => (
                      <SelectItem key={cast.id} value={cast.id.toString()}>
                        {cast.name} ({cast.mail})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 指名情報表示 */}
              <div className="bg-gray-50 rounded-none p-4">
                <h4 className="font-medium text-gray-900 mb-2">指名情報</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>指名タイプ:</span>
                    <span>{currentNominationType === 'main' ? '本指名' : '場内指名'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>テーブル:</span>
                    <span>{tableAuth?.table_label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>セッションID:</span>
                    <span>{localStorage.getItem('current_session_id') || '未設定'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNominationCastDialog(false);
                  setSelectedNominationCast('');
                  setCurrentNominationType(null);
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleNominationCastConfirm}
                disabled={!selectedNominationCast}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                確認
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 支払いモーダル */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                お支払い
              </DialogTitle>
              <DialogDescription>
                承認された商品の支払いを行います
              </DialogDescription>
            </DialogHeader>
            
            <StripeProvider>
              <StripePaymentForm
                amount={paymentAmount}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handlePaymentCancel}
              />
            </StripeProvider>
          </DialogContent>
        </Dialog>

        {/* 店長呼び出しキャスト選択ダイアログ */}
        <Dialog open={showManagerCallDialog} onOpenChange={setShowManagerCallDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                店長呼び出し - キャスト選択
              </DialogTitle>
              <DialogDescription>
                店長呼び出しを行うキャストを選択してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>キャスト選択</Label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableCasts.map((cast) => (
                    <div
                      key={cast.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCastForManagerCall?.id === cast.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedCastForManagerCall(cast)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{cast.name}</span>
                        {selectedCastForManagerCall?.id === cast.id && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManagerCallDialog(false);
                    setSelectedCastForManagerCall(null);
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleManagerCallSubmit}
                  disabled={!selectedCastForManagerCall}
                  className="bg-red-600 hover:bg-red-700"
                >
                  確認
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 指名選択必須ダイアログ */}
        <Dialog open={showNominationRequiredDialog} onOpenChange={setShowNominationRequiredDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                指名選択が必要です
              </DialogTitle>
              <DialogDescription>
                セッション終了前に指名タイプを選択してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">指名を選択してください</span>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  セッションを終了する前に、本指名または場内指名を選択する必要があります。
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline"
                onClick={() => setShowNominationRequiredDialog(false)}
              >
                閉じる
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
