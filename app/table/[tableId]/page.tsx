'use client';
import { MdHomeRepairService } from "react-icons/md"; 
import { BiUserPin } from "react-icons/bi"; 
import { SiBuymeacoffee } from "react-icons/si"; 
import { FaHome } from "react-icons/fa"; 
import { AiFillHome } from "react-icons/ai"; 

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Wine, Users, ShoppingCart, DollarSign, Clock, Package,
  ArrowLeft, Plus, Minus, Trash2, CheckCircle,
  AlertCircle, User, CreditCard, X, Bell, Utensils, Coffee, XCircle, AlertTriangle, Pause, Play, Edit2, Save
} from 'lucide-react';
import { getCurrentTable, TableAuth, startTableSession, endTableSession } from '@/lib/table-auth';
import { mockCustomers, formatCurrency } from '@/lib/mock-data';
import { calculateBack, formatBackAmount, formatBackRate } from '@/lib/cast-back-system';
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
  const [currentNominationType, setCurrentNominationType] = useState<'inside' | 'main' | 'together' | null>(null);
  const [showManagerCallDialog, setShowManagerCallDialog] = useState(false);
  const [selectedCastForManagerCall, setSelectedCastForManagerCall] = useState<{id: string, name: string} | null>(null);
  const [managerCallStatus, setManagerCallStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [previousManagerCallStatus, setPreviousManagerCallStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [showStaffCallDialog, setShowStaffCallDialog] = useState(false);
  const [selectedCastForStaffCall, setSelectedCastForStaffCall] = useState<string>('');
  const [staffCallStatus, setStaffCallStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [staffCallId, setStaffCallId] = useState<string | null>(null);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [leftMode, setLeftMode] = useState<'order' | 'nomination' | 'service'>('order');
  const [isOrderCartOpen, setIsOrderCartOpen] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [selectedCast, setSelectedCast] = useState<string>('none');
  const [isForCast, setIsForCast] = useState<boolean>(false);
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
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [showCashPaymentDialog, setShowCashPaymentDialog] = useState(false);
  const [cashPaymentAmount, setCashPaymentAmount] = useState<string>('');
  const [showStoreCreditCardPaymentDialog, setShowStoreCreditCardPaymentDialog] = useState(false);
  const [storeCreditCardPaymentAmount, setStoreCreditCardPaymentAmount] = useState<string>('');
  const [guestCount, setGuestCount] = useState<string>('');
  const [setExtensionCountdown, setSetExtensionCountdown] = useState<number>(0); // 再計算で設定する（初期表示のリセットを防止）
  const [setExtensions, setSetExtensions] = useState<Array<{ count: number; timestamp: number; price?: number }>>([]); // 延長履歴（priceは延長料金の合計を保存）
  const [showSetExtensionDialog, setShowSetExtensionDialog] = useState(false);
  const [extensionGuestCount, setExtensionGuestCount] = useState<string>('');
  const [isEditingRemainingTime, setIsEditingRemainingTime] = useState(false);
  const [editingRemainingMinutes, setEditingRemainingMinutes] = useState<string>('');
  const [editingRemainingSeconds, setEditingRemainingSeconds] = useState<string>('');
  const [nominations, setNominations] = useState<any[]>([]);
  const [isNominationsLoading, setIsNominationsLoading] = useState<boolean>(false);
  const [addCharges, setAddCharges] = useState<{[key: string]: number}>({});
  const [nominationCharges, setNominationCharges] = useState<number[]>([]); // 指名料金の履歴
  
  // 追加サービス関連
  const [showBottleKeepDialog, setShowBottleKeepDialog] = useState(false);
  const [bottleKeepData, setBottleKeepData] = useState({
    clientName: '',
    clientEmail: '',
    bottleName: '',
    amount: '',
    other: ''
  });
  const [showVipRoomDialog, setShowVipRoomDialog] = useState(false);
  const [vipRoomCount, setVipRoomCount] = useState<string>('');
  const [showKaraokeDialog, setShowKaraokeDialog] = useState(false);
  const [karaokeSongCount, setKaraokeSongCount] = useState<string>('');
  const [additionalServices, setAdditionalServices] = useState<Array<{
    type: 'bottle_keep' | 'vip_room' | 'karaoke';
    count: number;
    charge: number;
    timestamp: number;
  }>>([]);
  
  // 支払い完了後に商品の追加をロックするフラグ
  const hasAcceptedOrders = cartOrders.some(order => {
    const status = (orderRequestStatus as any)[order.id] || order.status;
    return status === 'accepted';
  });
  const isOrderingLocked = isPaymentCompleted && hasAcceptedOrders;
  const isTimeExpired = isSessionActive && setExtensionCountdown <= 0;
  const isOrderingDisabled = isTimeExpired || isPaymentCompleted;
  
  const router = useRouter();
  const { success, error, confirm } = useNotificationContext();

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

  const deleteNominationRecord = (nominationId: string) => {
    confirm(
      '指名削除',
      'この指名を削除しますか？',
      async () => {
        try {
          // 削除する指名を特定
          const nominationToDelete = nominations.find(n => n.id.toString() === nominationId);
          
          const response = await fetch(`/api/nominations?id=${nominationId}`, {
            method: 'DELETE'
          });
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || '指名の削除に失敗しました');
          }
          
          // 削除した指名の料金をnominationChargesから削除
          if (nominationToDelete) {
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

            let chargeToRemove = 0;
            if (nominationToDelete.type_id === 'together') {
              // 同伴指名の場合は本指名料と同伴料の合計を削除
              const mainCharge = charges['main'] || 0;
              const togetherCharge = charges['together'] || 0;
              chargeToRemove = mainCharge + togetherCharge;
            } else {
              chargeToRemove = charges[nominationToDelete.type_id] || 0;
            }
            
            console.log('指名削除時の料金:', { typeId: nominationToDelete.type_id, chargeToRemove, charges });
            
            // nominationChargesから該当する料金を1つ削除
            const index = nominationCharges.indexOf(chargeToRemove);
            if (index !== -1) {
              const updated = [...nominationCharges];
              updated.splice(index, 1);
              console.log('削除後の指名料金配列:', updated);
              setNominationCharges(updated);
              localStorage.setItem('nomination_charges', JSON.stringify(updated));
            }
          }
          
          success('削除完了', '指名を削除しました');
          await loadNominations();
        } catch (err) {
          console.error('指名削除エラー:', err);
          error('エラー', err instanceof Error ? err.message : '指名の削除に失敗しました');
        }
      }
    );
  };

  const nominationBadgeStyle: Record<'main' | 'inside' | 'together', string> = {
    main: 'bg-purple-50 text-purple-700 border-purple-200',
    inside: 'bg-blue-50 text-blue-700 border-blue-200',
    together: 'bg-rose-50 text-rose-700 border-rose-200'
  };

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
    loadAddCharges();
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
      if (savedNominationType === 'main' || savedNominationType === 'inside' || savedNominationType === 'together') {
        setCurrentNominationType(savedNominationType);
      }
      // 人数を復元
      const savedGuestCount = localStorage.getItem('guest_count');
      if (savedGuestCount) {
        setGuestCount(savedGuestCount);
      }
      // セット延長情報を復元
      const savedExtensions = localStorage.getItem('set_extensions');
      if (savedExtensions) {
        try {
          setSetExtensions(JSON.parse(savedExtensions));
        } catch (e) {
          console.error('延長情報の復元エラー:', e);
        }
      }
      // セッション情報を取得してカウントダウンを計算（DBから取得）
      if (isSessionActive) {
        loadSession();
      }
      // 指名料金を復元
      const savedNominationCharges = localStorage.getItem('nomination_charges');
      if (savedNominationCharges) {
        try {
          setNominationCharges(JSON.parse(savedNominationCharges));
        } catch (e) {
          console.error('指名料金の復元エラー:', e);
        }
      }
      // 追加サービスを復元
      const savedAdditionalServices = localStorage.getItem('additional_services');
      if (savedAdditionalServices) {
        try {
          setAdditionalServices(JSON.parse(savedAdditionalServices));
        } catch (e) {
          console.error('追加サービスの復元エラー:', e);
        }
      }
      // その後APIから最新データを取得
      loadCartOrders();
      loadServiceOrders();
      loadServices();
      loadManagerCallStatus();
      loadStaffCallStatus();
      loadNominations();
    }
  }, [tableAuth]);

  // セッション情報から決済完了状態を確認
  const checkPaymentStatus = async () => {
    if (!tableAuth || !isSessionActive) return;
    const sessionId = localStorage.getItem('current_session_id');
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions?id=${sessionId}`);
      const result = await response.json();
      if (result.success && result.data?.[0]) {
        const sessionData = result.data[0];
        if (sessionData.cost && parseFloat(sessionData.cost) > 0) {
          setIsPaymentCompleted(true);
          localStorage.setItem('payment_completed', 'true');
          localStorage.setItem('paid_amount', sessionData.cost.toString());
        }
      }
    } catch (err) {
      console.error('決済状態確認エラー:', err);
    }
  };

  // 定期的にスタッフ呼び出しステータスと注文カートを確認
  useEffect(() => {
    if (!tableAuth || !isSessionActive) return;
    
    // 初回実行
    checkPaymentStatus();
    loadNominations();
    loadAdditionalServices();
    
    const interval = setInterval(() => {
      loadManagerCallStatus();
      loadStaffCallStatus();
      loadCartOrdersSilently();
      loadServiceOrdersSilently();
      checkPaymentStatus();
      // 指名リストは3秒ごとに更新（ちらつき防止）
    }, 1000); // 1秒ごとに更新

    // 指名リストは別の間隔で更新
    const nominationInterval = setInterval(() => {
      loadNominations();
    }, 3000); // 3秒ごとに更新

    // 追加サービスは別の間隔で更新
    const additionalServicesInterval = setInterval(() => {
      loadAdditionalServices();
    }, 3000); // 3秒ごとに更新

    return () => {
      clearInterval(interval);
      clearInterval(nominationInterval);
      clearInterval(additionalServicesInterval);
    };
  }, [tableAuth, isSessionActive]);

  useEffect(() => {
    if (!tableAuth || !isSessionActive) return;
    loadNominations();
  }, [tableAuth, isSessionActive]);

  // セッション情報を取得
  const [session, setSession] = useState<{id: number; created_at: string; set_count: number; set_extensions?: Array<{ count: number; timestamp: number }>; is_paused?: boolean; paused_at?: string; paused_elapsed?: number} | null>(null);
  
  const loadSession = async () => {
    if (!tableAuth) return;
    
    try {
      const response = await fetch(`/api/sessions`);
      const result = await response.json();
      if (result.success) {
        // 該当テーブルのアクティブなセッション（status=1）を検索
        const tableActiveSession = result.data.find((s: any) => 
          s.table_id === parseInt(tableAuth.table_id) && s.status === 1
        );
        
        const sessionId = localStorage.getItem('current_session_id');
        
        // 管理者ページからセッションが開始された場合（isSessionActiveがfalseだが、アクティブなセッションが存在する）
        if (!isSessionActive && tableActiveSession) {
          // セッションを開始
          localStorage.setItem('current_session_id', tableActiveSession.id.toString());
          localStorage.setItem('set_count', (tableActiveSession.set_count || 1).toString());
          if (tableActiveSession.client) {
            localStorage.setItem('guest_count', tableActiveSession.client.toString());
            setGuestCount(tableActiveSession.client.toString());
          }
          setIsSessionActive(true);
          setSession(tableActiveSession);
          
          // セット延長情報を同期
          if (tableActiveSession.set_extensions) {
            setSetExtensions(tableActiveSession.set_extensions);
            localStorage.setItem('set_extensions', JSON.stringify(tableActiveSession.set_extensions));
          }
          
          // テーブルセッションを開始
          try {
            const updatedTable = await startTableSession(tableAuth.table_id);
            setTableAuth(updatedTable);
          } catch (err) {
            console.error('テーブルセッション開始エラー:', err);
          }
          
          success('セッション開始', 'セッションが開始されました');
          return;
        }
        
        // 既存のセッションIDがある場合
        if (sessionId) {
          const sessionData = result.data.find((s: any) => s.id.toString() === sessionId);
          
          // セッションが終了した場合（status=0）を検出
          if (sessionData && sessionData.status === 0) {
            // セッションから退出
            setIsSessionActive(false);
            localStorage.removeItem('current_session_id');
            localStorage.removeItem('set_count');
            localStorage.removeItem('guest_count');
            localStorage.removeItem('set_extensions');
            localStorage.removeItem('set_extension_start_time');
            localStorage.removeItem('set_extension_total_seconds');
            setSetExtensions([]);
            setSetExtensionCountdown(0);
            setSession(null);
            
            // テーブルセッションを終了
            try {
              const updatedTable = await endTableSession(tableAuth.table_id);
              setTableAuth(updatedTable);
            } catch (err) {
              console.error('テーブルセッション終了エラー:', err);
            }
            
            // 状態をリセット
            setCartOrders([]);
            setServiceOrders([]);
            setNominations([]);
            setNominationCharges([]);
            setAdditionalServices([]);
            setIsPaymentCompleted(false);
            setCurrentNominationType(null);
            
            success('セッション終了', 'セッションが終了されました');
            return;
          }
          
          const activeSession = result.data.find((s: any) => s.id.toString() === sessionId && s.status === 1);
          if (activeSession) {
            setSession(activeSession);
            // セット延長情報を同期
            if (activeSession.set_extensions) {
              setSetExtensions(activeSession.set_extensions);
              localStorage.setItem('set_extensions', JSON.stringify(activeSession.set_extensions));
            }
          }
        }
      }
    } catch (err) {
      console.error('セッション情報取得エラー:', err);
    }
  };

  // セット延長カウントダウンタイマー（データベースのセッション情報から算出）
  useEffect(() => {
    if (!isSessionActive || !session) return;
    
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
        // 現在停止中の場合、停止開始時刻からの経過時間を追加
        const pausedAt = new Date(session.paused_at).getTime();
        const currentPauseTime = Math.floor((now - pausedAt) / 1000);
        elapsed -= (pausedElapsed + currentPauseTime);
      } else {
        // 停止していない場合、累積停止時間を減算
        elapsed -= pausedElapsed;
      }
      
      const remaining = Math.max(0, totalSeconds - elapsed);
      
      setSetExtensionCountdown(remaining);
    };
    
    // 初回更新
    updateCountdown();
    
    // 1秒ごとに更新（停止中でも更新して表示を維持）
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [isSessionActive, session]);
  
  // セッション情報を定期的に取得（セット延長情報の同期のため、および管理者ページからセッション開始を検出）
  useEffect(() => {
    if (!tableAuth) return;
    
    // 初回読み込み
    loadSession();
    
    // 1秒ごとに更新（セット延長情報の同期、および管理者ページからセッション開始を検出、残り時間変更の即時反映のため）
    const interval = setInterval(() => {
      loadSession();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [tableAuth]);

  const loadCasts = async () => {
    try {
      setIsCastsLoading(true);
      // 出勤中のキャストのみを取得
      const response = await fetch('/api/casts?only_active=true');
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
    } catch (err) {
      console.error('追加料金取得エラー:', err);
    }
  };

  const loadNominations = async () => {
    if (!tableAuth) return;
    const sessionId = localStorage.getItem('current_session_id');
    if (!sessionId) return;

    try {
      // cost更新（延長時の加算）を確実に反映するためキャッシュを避ける
      const response = await fetch(
        `/api/nominations?table_id=${tableAuth.table_id}&session_id=${sessionId}&_ts=${Date.now()}`,
        { cache: 'no-store' }
      );
      const result = await response.json();
      if (result.success) {
        const newNominations = result.nominations || [];
        // データが変更された場合のみ状態を更新（ちらつき防止）
        setNominations(prev => {
          // NOTE: cost が変わるケース（延長時の加算）を検出できるように cost/updated_at も比較に含める
          const prevStr = JSON.stringify(
            prev.map((n: any) => ({
              id: n.id,
              cast_name: n.cast_name,
              type_id: n.type_id,
              cost: n.cost,
              created_at: n.created_at,
              updated_at: n.updated_at,
            }))
          );
          const newStr = JSON.stringify(
            newNominations.map((n: any) => ({
              id: n.id,
              cast_name: n.cast_name,
              type_id: n.type_id,
              cost: n.cost,
              created_at: n.created_at,
              updated_at: n.updated_at,
            }))
          );
          if (prevStr !== newStr) {
            return newNominations;
          }
          return prev;
        });
      } else {
        error('エラー', result.error || '指名の取得に失敗しました');
      }
    } catch (err) {
      console.error('指名取得エラー:', err);
      error('エラー', '指名の取得に失敗しました');
    }
  };

  // 追加サービスをAPIから取得
  const loadAdditionalServices = async () => {
    if (!tableAuth) return;
    const sessionId = localStorage.getItem('current_session_id');
    if (!sessionId) return;

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
            // ローカルストレージにも保存
            localStorage.setItem('additional_services', JSON.stringify(newServices));
            return newServices;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('追加サービス取得エラー:', err);
    }
  };

  const submitNomination = async (castId: string, typeId: 'main' | 'inside' | 'together', castName?: string) => {
    if (!tableAuth) return;
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、指名を追加できません' : 'セット時間が終了したため、指名を追加できません');
      return false;
    }
    const sessionId = localStorage.getItem('current_session_id');
    if (!sessionId) {
      error('エラー', 'セッションIDが見つかりません');
      return false;
    }

    try {
      // 指名料金を計算
      // addChargesが空の場合は再取得
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
      if (typeId === 'together') {
        // 同伴指名の場合は本指名料と同伴料の両方を追加
        const mainCharge = charges['main'] || 0;
        const togetherCharge = charges['together'] || 0;
        nominationCharge = mainCharge + togetherCharge;
      } else {
        // その他の指名の場合は該当する料金を追加
        nominationCharge = charges[typeId] || 0;
      }

      // 指名を登録（costを含む）
      const response = await fetch('/api/nominations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          castId: parseInt(castId, 10),
          tableId: parseInt(tableAuth.table_id, 10),
          sessionId: parseInt(sessionId, 10),
          typeId,
          cost: nominationCharge
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '指名の登録に失敗しました');
      }
      
      console.log('指名料金追加:', { typeId, nominationCharge, charges });
      
      setNominationCharges(prev => {
        const updated = [...prev, nominationCharge];
        console.log('指名料金配列更新:', updated);
        // ローカルストレージに保存
        localStorage.setItem('nomination_charges', JSON.stringify(updated));
        return updated;
      });

      success('指名完了', `${castName ?? 'キャスト'}を${getNominationTypeLabel(typeId)}として登録しました`);
      await loadNominations();
      return true;
    } catch (err) {
      console.error('指名登録エラー:', err);
      error('エラー', err instanceof Error ? err.message : '指名の登録に失敗しました');
      return false;
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
          // ステータスをそのまま反映（pending, accepted, rejected）
          if (order.status) {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: order.status }));
          } else {
            // ステータスがない場合はpendingとして扱う
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'pending' }));
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
          // ステータスをそのまま反映（pending, accepted, rejected）
          if (order.status) {
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: order.status }));
          } else {
            // ステータスがない場合はpendingとして扱う
            setServiceRequestStatus(prev => ({ ...prev, [order.id]: 'pending' }));
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
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、商品の追加はできません' : 'セット時間が終了したため、商品の追加はできません');
      return;
    }
    setSelectedProduct(menuItem);
    setOrderQuantity(1);
    setSelectedCast('none');
    setIsForCast(false);
    setShowOrderDialog(true);
    loadCasts(); // キャスト一覧を読み込み
  };

  const handleOrderSubmit = async () => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、商品の追加はできません' : 'セット時間が終了したため、商品の追加はできません');
      return;
    }
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
          session_id: parseInt(sessionId),
          for_cast: isForCast ? 1 : 0
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        success('注文完了', '注文が確定されました');
        setShowOrderDialog(false);
        setSelectedProduct(null);
        setOrderQuantity(1);
        setSelectedCast('none');
        setIsForCast(false);
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

  const handleServiceOrderFromCall = (serviceName: string) => {
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、サービスを注文できません');
      return;
    }
    if (!tableAuth) {
      error('エラー', 'テーブル情報が見つかりません');
      return;
    }

    // サービス名からサービスを検索
    const foundService = services.find((s: any) => 
      s.name === serviceName || 
      s.name.includes(serviceName) || 
      serviceName.includes(s.name)
    );

    if (!foundService) {
      error('エラー', `サービス「${serviceName}」が見つかりません`);
      return;
    }

    setSelectedService(foundService);
    setServiceOrderQuantity(1);
    setSelectedServiceCast('none');
    setShowServiceOrderDialog(true);
    loadCasts();
  };

  const handleServiceOrder = (service: any) => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、サービスを注文できません' : 'セット時間が終了したため、サービスを注文できません');
      return;
    }
    setSelectedService(service);
    setServiceOrderQuantity(1);
    setSelectedServiceCast('none');
    setShowServiceOrderDialog(true);
    loadCasts();
  };

  const handleServiceOrderSubmit = async () => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、サービスを注文できません' : 'セット時間が終了したため、サービスを注文できません');
      return;
    }
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
        
        // サービス注文をカートに追加
        if (result.data) {
          const newServiceOrder = {
            ...result.data,
            service_name: selectedService.name,
            cast_name: selectedServiceCast && selectedServiceCast !== 'none' ? 
              casts.find(c => c.id.toString() === selectedServiceCast)?.name || '未選択' : null
          };
          
          setServiceOrders(prev => [...prev, newServiceOrder]);
          
          // ステータスをpendingに設定（管理者の承認待ち）
          if (result.data.id) {
            setServiceRequestStatus(prev => ({ ...prev, [result.data.id]: 'pending' }));
          }
        }
        
        loadServiceOrders(); // サービス注文を更新

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
    if (!tableAuth || !guestCount || guestCount.trim() === '') {
      error('エラー', '人数を入力してください');
      return;
    }
    
    // 人数がテーブルの定員を超えていないかチェック
    const numGuestCount = parseInt(guestCount);
    if (isNaN(numGuestCount) || numGuestCount <= 0) {
      error('エラー', '有効な人数を入力してください');
      return;
    }
    
    if (tableAuth.capacity && numGuestCount > tableAuth.capacity) {
      error('エラー', `人数はテーブルの定員（${tableAuth.capacity}名）以下で入力してください`);
      return;
    }
    
    try {
      // セット料金（DB: add_charges の set_price.value）が未設定なら開始できない
      let charges = addCharges;
      if (Object.keys(charges).length === 0 || charges['set_price'] === undefined) {
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

      if (charges['set_price'] === undefined) {
        error('エラー', 'セット料金（add_charges: set_price）が未設定です。管理者画面の追加料金設定で登録してください。');
        return;
      }

      // 人数をローカルストレージに保存
      localStorage.setItem('guest_count', guestCount);
      
      // データベースにセッションを作成 (status=1, client=人数)
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: parseInt(tableAuth.table_id),
          cost: 0,
          client: parseInt(guestCount),
          status: 1
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'セッション作成に失敗しました');
      }

      // ローカルストレージにcurrent_session_idを保存
      localStorage.setItem('current_session_id', result.data.id.toString());
      
      // セットカウントを1で初期化
      localStorage.setItem('set_count', '1');
      
      // 支払い状態をリセット
      setIsPaymentCompleted(false);
      localStorage.removeItem('payment_completed');
      
      const updatedTable = await startTableSession(tableAuth.table_id);
      setTableAuth(updatedTable);
      setIsSessionActive(true);
      // セット延長タイマーを初期化（DBから取得したセッション情報で計算される）
      setSetExtensions([]); // 延長履歴をクリア
      localStorage.removeItem('set_extensions'); // 延長履歴をクリア
      // セッション情報を取得してカウントダウンを更新
      await loadSession();
      
      // セッション作成時に既に停止状態で初期化されているため、追加の初期化は不要
      // （API側でis_paused: true, paused_at: 現在時刻, paused_elapsed: 0, set_extensions: []が設定済み）
      // 指名料金をクリア
      setNominationCharges([]);
      localStorage.removeItem('nomination_charges');
      await loadNominations();
      success('セッション開始', 'セッションを開始しました');
    } catch (err) {
      console.error('セッション開始エラー:', err);
      error('エラー', 'セッション開始に失敗しました');
    }
  };

  const endSession = async () => {
    if (!tableAuth) return;
    
    confirm(
      'セッション終了',
      'セッションを終了しますか？',
      async () => {
        try {
          const sessionId = localStorage.getItem('current_session_id');
          const setCount = localStorage.getItem('set_count');
          const endAt = new Date().toISOString();
          
          if (sessionId) {
            // データベースにセッション終了情報を保存（costは保存しない）
            const guestCountLocal = localStorage.getItem('guest_count');
            const response = await fetch(`/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                end_at: endAt,
                set_count: setCount ? parseInt(setCount) : 1,
                client: guestCountLocal ? parseInt(guestCountLocal, 10) : undefined,
                status: 0
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
          localStorage.removeItem('fullcost');
          localStorage.removeItem('paid_amount');
          localStorage.removeItem('payment_completed');
          localStorage.removeItem('set_count');
          
          // テーブルセッションを終了
          const updatedTable = await endTableSession(tableAuth.table_id);
          setTableAuth(updatedTable);
          setIsSessionActive(false);
          
          // 状態をリセット
          setCartOrders([]);
          setCountdownTimers({});
          setOrderRequestStatus({});
          setServiceOrders([]);
          setServiceRequestStatus({});
          setIsPaymentCompleted(false);
          setCurrentNominationType(null);
          setNominations([]);
          setSetExtensions([]);
          localStorage.removeItem('set_extension_start_time');
          localStorage.removeItem('set_extension_total_seconds');
          localStorage.removeItem('set_extensions');
          setSetExtensionCountdown(0);
          
          // DBにset_extensionsをクリア
          if (sessionId) {
            try {
              await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ set_extensions: [] })
              });
            } catch (err) {
              console.error('set_extensionsクリアエラー:', err);
            }
          }
          
          // 指名料金をクリア
          setNominationCharges([]);
          localStorage.removeItem('nomination_charges');
          // 追加サービスをクリア
          setAdditionalServices([]);
          localStorage.removeItem('additional_services');
          
          success('セッション終了', 'セッションを終了しました');
        } catch (err) {
          console.error('セッション終了エラー:', err);
          error('エラー', `セッション終了に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
        }
      }
    );
  };

  const calculateTotal = () => {
    let subtotal = 0;
    const setPrice = addCharges['set_price'] || 0;
    const extensionPrice = addCharges['extension_price'] || 0;
    
    // 商品の合計
    if (cartOrders && cartOrders.length > 0) {
      const productTotal = cartOrders.reduce((sum, order) => {
      // 承認された商品のみを合計に含める
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
    
    // セッション開始時の料金（add_charges の set_price.value × 人数）
    if (guestCount && guestCount.trim() !== '') {
      const initialGuestCount = parseInt(guestCount);
      if (!isNaN(initialGuestCount) && initialGuestCount > 0) {
        subtotal += setPrice * initialGuestCount;
      }
    }
    
    // セット延長料金（add_charges の extension_price.value × 延長時人数）
    setExtensions.forEach(extension => {
      if (extension.count > 0) {
        // 既存データ互換: priceが入っていればそれを優先（合計）、無ければ単価×人数で計算
        subtotal += (extension.price ?? (extensionPrice * extension.count));
      }
    });
    
    // 指名料金（DBのnomination.costは「指名登録 + 延長時加算」の累計になっている前提）
    nominations.forEach(nomination => {
      const cost = Number((nomination as any).cost);
      subtotal += Number.isFinite(cost) ? cost : 0;
    });
    
    // 追加サービス料金の合計
    additionalServices.forEach(service => {
      subtotal += service.charge;
    });
    
    // サービス手数料（10%）を追加
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;
    
    // ローカルストレージに保存
    localStorage.setItem('fullcost', total.toString());
    
    return total;
  };

  // 支払い金額を計算（合計の1.1倍 = 10%追加）
  const calculatePaymentAmount = () => {
    const total = calculateTotal();
    const paymentAmount = Math.round(total * 1.1);
    return paymentAmount;
  };

  const calculateCastBack = () => {
    return cartOrders.reduce((total, order) => {
      if (!order.cast_id) return total;
      
      // For now, return 0 as we don't have back calculation for the new system
      // This can be implemented later if needed
      return total;
    }, 0);
  };

  // セット延長処理
  const handleSetExtension = () => {
    setShowSetExtensionDialog(true);
  };

  const confirmSetExtension = async () => {
    if (!extensionGuestCount || extensionGuestCount.trim() === '') {
      error('エラー', '人数を入力してください');
      return;
    }

    const count = parseInt(extensionGuestCount);
    if (isNaN(count) || count <= 0) {
      error('エラー', '有効な人数を入力してください');
      return;
    }

    // 人数がテーブルの定員を超えていないかチェック
    if (tableAuth && tableAuth.capacity && count > tableAuth.capacity) {
      error('エラー', `人数はテーブルの定員（${tableAuth.capacity}名）以下で入力してください`);
      return;
    }

    if (!session) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }

    // 延長料金（DB: add_charges の extension_price.value）を取得（単価）
    let charges = addCharges;
    if (Object.keys(charges).length === 0 || charges['extension_price'] === undefined) {
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

    if (charges['extension_price'] === undefined) {
      error('エラー', '延長料金（add_charges: extension_price）が未設定です。管理者画面の追加料金設定で登録してください。');
      return;
    }

    // 延長情報を追加（priceは「延長料金の合計」＝単価×人数として保存し、明細を固定化）
    const extensionUnitPrice = charges['extension_price'];
    const newExtension = { count, timestamp: Date.now(), price: extensionUnitPrice * count };
    const updatedExtensions = [...setExtensions, newExtension];
    setSetExtensions(updatedExtensions);
    
    // ローカルストレージに保存
    localStorage.setItem('set_extensions', JSON.stringify(updatedExtensions));
    
    // セットカウントを1増加（データベースのセッション情報から取得）
    const currentSetCount = session.set_count || 1;
    const newSetCount = currentSetCount + 1;
    localStorage.setItem('set_count', newSetCount.toString());
    
    // DBにset_countとset_extensionsを同期
    const sessionId = localStorage.getItem('current_session_id');
    if (sessionId) {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            set_count: newSetCount,
            set_extensions: updatedExtensions
          })
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'セット延長の更新に失敗しました');
        }
      } catch (err) {
        console.error('セット回数のDB同期エラー:', err);
        error('エラー', err instanceof Error ? err.message : 'セット延長の更新に失敗しました');
        return;
      }
    }
    
    // セッション情報を再取得してカウントダウンを更新（DB更新後に反映される）
    await loadSession();
    
    // 成功メッセージを表示
    success('セット延長', `${count}名でセットを延長しました（60分追加）`);
    
    // ダイアログを閉じる
    setShowSetExtensionDialog(false);
    setExtensionGuestCount('');
    
    // 現在の指名リストの料金を追加
    // addChargesが空の場合は再取得
    charges = charges;
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

    const extensionNominationCharges: number[] = [];
    const nominationDeltaById = new Map<number, { add: number; toMainFlag?: 1; rankCostAdd: number; rankPointAdd: number }>();
    
    // 各指名のcostを更新（延長のたびに「該当する指名料」を加算）
    // 仕様: 延長時に場内指名(inside)は自動的に本指名(main)へ切り替え、基本料金に本指名料金を加算する
    for (const nomination of nominations) {
      let charge = 0;
      const mainCharge = charges['main'] || 0;

      if (nomination.type_id === 'inside') {
        // 場内指名は本指名に切り替え → 本指名料金を加算
        charge = mainCharge;
      } else if (nomination.type_id === 'together') {
        // 同伴指名は延長時は本指名料金を加算（既存仕様踏襲）
        charge = mainCharge;
      } else {
        // main など
        charge = mainCharge;
      }
      extensionNominationCharges.push(charge);
      if (charge > 0) {
        // rank_cost は「延長料金(1名分) + 本指名料」を加算、rank_point は延長ごとに +1
        const extTotal = newExtension.price ?? 0;
        const extUnit = count > 0 ? extTotal / count : 0;
        nominationDeltaById.set(Number(nomination.id), {
          add: charge,
          ...(nomination.type_id === 'inside' ? { toMainFlag: 1 as const } : {}),
          rankCostAdd: extUnit + charge,
          rankPointAdd: 1,
        });
      }
      
      // nominationテーブルのcostを更新
      if (charge > 0) {
        try {
          await fetch(`/api/nominations/${nomination.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cost: charge,
              ...(nomination.type_id === 'inside' ? { tomain_nomination: 1 } : {}),
              // rank用加算
              rank_cost_add: (count > 0 ? (newExtension.price ?? 0) / count : 0) + charge,
              rank_point_add: 1
            })
          });
        } catch (err) {
          console.error(`指名ID ${nomination.id} のcost更新エラー:`, err);
        }
      }
    }

    // UIを即時反映（F5不要）。DB反映はこの後のloadNominationsで最終同期する。
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
            // type_idはinsideのまま維持し、フラグで「本指名扱い」を示す
            tomain_nomination: delta.toMainFlag ?? n.tomain_nomination ?? 0,
            // rank系は画面表示に使う可能性があるため即時反映
            rank_cost: (Number(n.rank_cost) || 0) + (Number(delta.rankCostAdd) || 0),
            rank_point: (Number(n.rank_point) || 0) + (Number(delta.rankPointAdd) || 0),
            updated_at: new Date().toISOString(),
          };
        })
      );
    }
    
    console.log('セット延長時の指名料金:', extensionNominationCharges, 'charges:', charges);
    
    if (extensionNominationCharges.length > 0) {
      setNominationCharges(prev => {
        const updated = [...prev, ...extensionNominationCharges];
        console.log('セット延長後の指名料金配列:', updated);
        localStorage.setItem('nomination_charges', JSON.stringify(updated));
        return updated;
      });
    }
    
    // 指名リストを再読み込み
    await loadNominations();
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
        
        await loadSession();
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
        
        await loadSession();
        success('停止', 'セット延長タイマーを停止しました');
      } catch (err) {
        console.error('停止エラー:', err);
        error('エラー', err instanceof Error ? err.message : 'タイマーの停止に失敗しました');
      }
    }
  };

  // 1セットキャンセル処理
  const handleCancelSet = () => {
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
        const sessionId = localStorage.getItem('current_session_id');
        if (sessionId) {
          try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                set_count: newSetCount,
                set_extensions: updatedExtensions
              })
            });
            
            const result = await response.json();
            if (!result.success) {
              throw new Error(result.error || 'セットキャンセルの更新に失敗しました');
            }
            
            // ローカルストレージに保存
            if (updatedExtensions.length > 0) {
              localStorage.setItem('set_extensions', JSON.stringify(updatedExtensions));
            } else {
              localStorage.removeItem('set_extensions');
            }
            localStorage.setItem('set_count', newSetCount.toString());
            
            // ローカルステートを更新
            setSetExtensions(updatedExtensions);
            
            // セッション情報を再取得してカウントダウンを更新（DB更新後に反映される）
            await loadSession();
            
            success('セットキャンセル', `${lastExtension.count}名分のセットをキャンセルしました`);
          } catch (err) {
            console.error('セットキャンセルエラー:', err);
            error('エラー', err instanceof Error ? err.message : 'セットキャンセルに失敗しました');
          }
        } else {
          error('エラー', 'セッションIDが見つかりません');
        }
      }
    );
  };

  // ボトルキープ処理
  const handleBottleKeepConfirm = async () => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、追加サービスを利用できません' : 'セット時間が終了したため、追加サービスを利用できません');
      return;
    }
    if (!bottleKeepData.clientName || !bottleKeepData.bottleName || !bottleKeepData.amount) {
      error('エラー', '顧客名、ボトル名、残量を入力してください');
      return;
    }

    const amount = parseInt(bottleKeepData.amount);
    if (isNaN(amount) || amount < 0) {
      error('エラー', '有効な残量を入力してください');
      return;
    }

    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId || !tableAuth) {
        error('エラー', 'セッション情報が見つかりません');
        return;
      }

      // ボトルキープ情報をデータベースに保存
      const response = await fetch('/api/bottle-keep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: bottleKeepData.clientName,
          clientEmail: bottleKeepData.clientEmail || null,
          bottleName: bottleKeepData.bottleName,
          amount: amount,
          sessionId: parseInt(sessionId),
          tableId: parseInt(tableAuth.table_id),
          other: bottleKeepData.other || null
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'ボトルキープの登録に失敗しました');
      }

      // ボトルキープ料金を追加
      const bottleKeepCharge = addCharges['bottle_keep'] || 0;
      
      // APIに追加サービスを保存
      const additionalServiceResponse = await fetch('/api/additional-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: parseInt(sessionId),
          type: 'bottle_keep',
          count: 1,
          charge: bottleKeepCharge
        })
      });

      const additionalServiceResult = await additionalServiceResponse.json();
      if (!additionalServiceResult.success) {
        throw new Error(additionalServiceResult.error || '追加サービスの登録に失敗しました');
      }

      const newService = additionalServiceResult.data;
      
      setAdditionalServices(prev => {
        const updated = [...prev, newService];
        localStorage.setItem('additional_services', JSON.stringify(updated));
        return updated;
      });

      // ダイアログを閉じてフォームをリセット
      setShowBottleKeepDialog(false);
      setBottleKeepData({
        clientName: '',
        clientEmail: '',
        bottleName: '',
        amount: '',
        other: ''
      });

      success('ボトルキープ登録', 'ボトルキープを登録しました');
    } catch (err) {
      console.error('ボトルキープ登録エラー:', err);
      error('エラー', err instanceof Error ? err.message : 'ボトルキープの登録に失敗しました');
    }
  };

  // VIPルーム利用処理
  const handleVipRoomConfirm = async () => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、追加サービスを利用できません' : 'セット時間が終了したため、追加サービスを利用できません');
      return;
    }
    if (!vipRoomCount || vipRoomCount.trim() === '') {
      error('エラー', '部屋数を入力してください');
      return;
    }

    const count = parseInt(vipRoomCount);
    if (isNaN(count) || count <= 0) {
      error('エラー', '有効な部屋数を入力してください');
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

    const vipRoomCharge = (charges['vip_room'] || 0) * count;
    console.log('VIPルーム料金追加:', { count, vipRoomCharge, charges });
    
    // セッションIDを取得
    const sessionId = localStorage.getItem('current_session_id');
    if (!sessionId) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }

    // APIに追加サービスを保存
    const additionalServiceResponse = await fetch('/api/additional-services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: parseInt(sessionId),
        type: 'vip_room',
        count: count,
        charge: vipRoomCharge
      })
    });

    const additionalServiceResult = await additionalServiceResponse.json();
    if (!additionalServiceResult.success) {
      error('エラー', additionalServiceResult.error || '追加サービスの登録に失敗しました');
      return;
    }

    const newService = additionalServiceResult.data;
    
    setAdditionalServices(prev => {
      const updated = [...prev, newService];
      console.log('追加サービス更新:', updated);
      localStorage.setItem('additional_services', JSON.stringify(updated));
      return updated;
    });

    setShowVipRoomDialog(false);
    setVipRoomCount('');
    success('VIPルーム利用', `${count}部屋のVIPルーム利用を追加しました`);
  };

  // カラオケ利用処理
  const handleKaraokeConfirm = async () => {
    if (isOrderingDisabled) {
      error('エラー', isPaymentCompleted ? '決済が完了しているため、追加サービスを利用できません' : 'セット時間が終了したため、追加サービスを利用できません');
      return;
    }
    if (!karaokeSongCount || karaokeSongCount.trim() === '') {
      error('エラー', '曲数を入力してください');
      return;
    }

    const count = parseInt(karaokeSongCount);
    if (isNaN(count) || count <= 0) {
      error('エラー', '有効な曲数を入力してください');
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

    const karaokeCharge = (charges['song_room'] || 0) * count;
    console.log('カラオケ料金追加:', { count, karaokeCharge, charges });
    
    // セッションIDを取得
    const sessionId = localStorage.getItem('current_session_id');
    if (!sessionId) {
      error('エラー', 'セッション情報が見つかりません');
      return;
    }

    // APIに追加サービスを保存
    const additionalServiceResponse = await fetch('/api/additional-services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: parseInt(sessionId),
        type: 'karaoke',
        count: count,
        charge: karaokeCharge
      })
    });

    const additionalServiceResult = await additionalServiceResponse.json();
    if (!additionalServiceResult.success) {
      error('エラー', additionalServiceResult.error || '追加サービスの登録に失敗しました');
      return;
    }

    const newService = additionalServiceResult.data;
    
    setAdditionalServices(prev => {
      const updated = [...prev, newService];
      console.log('追加サービス更新:', updated);
      localStorage.setItem('additional_services', JSON.stringify(updated));
      return updated;
    });

    setShowKaraokeDialog(false);
    setKaraokeSongCount('');
    success('カラオケ利用', `${count}曲のカラオケ利用を追加しました`);
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
    
    // 決済方法選択ダイアログを表示
    setShowPaymentMethodDialog(true);
  };

  const handleCreditCardPayment = () => {
    // 支払い金額は合計の1.1倍（10%追加）
    const paymentAmount = calculatePaymentAmount();
    
    setPaymentAmount(paymentAmount);
    setShowPaymentMethodDialog(false);
    setShowPaymentDialog(true);
  };

  const handleCashPayment = () => {
    setShowPaymentMethodDialog(false);
    setShowCashPaymentDialog(true);
    setCashPaymentAmount('');
  };

  const handleStoreCreditCardPayment = () => {
    setShowPaymentMethodDialog(false);
    setShowStoreCreditCardPaymentDialog(true);
    setStoreCreditCardPaymentAmount('');
  };

  const handleStoreCreditCardPaymentConfirm = async () => {
    const amount = parseFloat(storeCreditCardPaymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      error('エラー', '有効な金額を入力してください');
      return;
    }

    const totalAmount = calculateTotal();
    if (amount < totalAmount) {
      error('エラー', `支払い金額は合計金額（${formatCurrency(totalAmount)}）以上である必要があります`);
      return;
    }
    
    // ローカルストレージのfullcostに保存
    localStorage.setItem('fullcost', amount.toString());
    
    // 支払い金額をローカルストレージに保存（表示用）
    localStorage.setItem('paid_amount', amount.toString());
    
    // 支払い完了状態を設定
    setIsPaymentCompleted(true);
    localStorage.setItem('payment_completed', 'true');
    
    // sessionsテーブルも更新
    const sessionId = localStorage.getItem('current_session_id');
    if (sessionId) {
      const currentCost = localStorage.getItem('cost') || '0';
      const newCost = parseInt(currentCost) + amount;
      localStorage.setItem('cost', newCost.toString());
      
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
    
    success('決済成功', `支払いが完了しました`);
    setShowStoreCreditCardPaymentDialog(false);
    setStoreCreditCardPaymentAmount('');
  };

  const handleCashPaymentConfirm = async () => {
    const amount = parseFloat(cashPaymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      error('エラー', '有効な金額を入力してください');
      return;
    }

    const totalAmount = calculateTotal();
    if (amount < totalAmount) {
      error('エラー', `支払い金額は合計金額（${formatCurrency(totalAmount)}）以上である必要があります`);
      return;
    }
    
    // ローカルストレージのfullcostに保存
    localStorage.setItem('fullcost', amount.toString());
    
    // 支払い金額をローカルストレージに保存（表示用）
    localStorage.setItem('paid_amount', amount.toString());
    
    // 支払い完了状態を設定
    setIsPaymentCompleted(true);
    localStorage.setItem('payment_completed', 'true');
    
    // sessionsテーブルも更新
    const sessionId = localStorage.getItem('current_session_id');
    if (sessionId) {
      const currentCost = localStorage.getItem('cost') || '0';
      const newCost = parseInt(currentCost) + amount;
      localStorage.setItem('cost', newCost.toString());
      
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
    
    success('決済成功', `支払いが完了しました`);
    setShowCashPaymentDialog(false);
    setCashPaymentAmount('');
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    // 支払い完了後、ローカルストレージのcost項目に保存
    const currentCost = localStorage.getItem('cost') || '0';
    const newCost = parseInt(currentCost) + paymentAmount;
    localStorage.setItem('cost', newCost.toString());
    
    // 支払い金額をローカルストレージに保存（表示用）
    localStorage.setItem('paid_amount', paymentAmount.toString());
    
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
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、指名はできません');
      return;
    }
    // 指名の場合はキャスト選択が必要
    setSelectedMenuItem({ type: 'nomination' });
    setShowCastSelection(true);
  };

  const handleNominationCastSelection = async (castId: string, castName: string) => {
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、指名はできません');
      return;
    }
    if (!selectedMenuItem || !tableAuth) return;

    try {
      const typeId = selectedMenuItem.nominationType === 'nomination' ? 'main' : 'inside';
      await submitNomination(castId, typeId, castName);
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
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、指名はできません');
      return;
    }
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
      await submitNomination(fieldNominationCast, 'inside', selectedCast.name);
      setShowFieldNominationDialog(false);
      setFieldNominationCast('');
    } catch (err) {
      error('エラー', '場内指名に失敗しました');
    }
  };

  const handleNominationTypeSelection = async (nominationType: 'main' | 'field') => {
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、指名はできません');
      return;
    }
    if (!selectedCastForNomination || !tableAuth) return;

    try {
      const typeId = nominationType === 'main' ? 'main' : 'inside';
      await submitNomination(selectedCastForNomination.id, typeId, selectedCastForNomination.name);
      setShowNominationTypeDialog(false);
      setSelectedCastForNomination(null);
    } catch (err) {
      error('エラー', '指名に失敗しました');
    }
  };

  const handleNominationCastConfirm = async () => {
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、指名はできません');
        return;
      }
    if (!selectedNominationCast || !currentNominationType || !tableAuth) return;

    try {
      const selectedCast = availableCasts.find(cast => cast.id.toString() === selectedNominationCast);
      const castName = selectedCast?.name ?? 'キャスト';
      const successFlag = await submitNomination(selectedNominationCast, currentNominationType, castName);
      if (!successFlag) return;
      
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

    if (callType === 'service') {
      // スタッフ呼び出しの場合はキャスト選択モーダルを表示
      if (staffCallStatus === 'pending' || staffCallStatus === 'accepted') {
        error('エラー', '既にスタッフ呼び出しが送信されています');
        return;
      }
      setShowStaffCallDialog(true);
      loadCasts();
      return;
    }

    // マネージャー呼び出しなどの他のタイプは従来通り
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

  const handleStaffCallConfirm = async () => {
    if (!tableAuth) {
      error('エラー', 'テーブル情報が見つかりません');
      return;
    }

    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、スタッフ呼び出しはできません');
      return;
    }

    try {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) {
        error('エラー', 'セッションが見つかりません');
        return;
      }

      // callmanagerテーブルにスタッフ呼び出しを保存
      const response = await fetch('/api/callmanager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cast_id: selectedCastForStaffCall ? parseInt(selectedCastForStaffCall) : null,
          table_id: parseInt(tableAuth.table_id),
          session_id: parseInt(sessionId),
          calltype: 'service'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setStaffCallStatus('pending');
        setStaffCallId(result.data.id.toString());
        setShowStaffCallDialog(false);
        setSelectedCastForStaffCall('');
        success('呼び出し完了', 'スタッフに通知されました');

        // スタッフ呼び出し通知を作成
        try {
          const selectedCast = selectedCastForStaffCall ? casts.find(c => c.id.toString() === selectedCastForStaffCall) : null;
          await createOrderNotification(
            tableAuth.table_id,
            tableAuth.table_label,
            'staff_call',
            selectedCast ? `スタッフ呼び出し (${selectedCast.name})` : 'スタッフ呼び出し',
            'high',
            1
          );
        } catch (notificationError) {
          console.error('通知送信エラー:', notificationError);
        }
      } else {
        error('エラー', result.error || '呼び出しに失敗しました');
      }
    } catch (err) {
      console.error('スタッフ呼び出しエラー:', err);
      error('エラー', '呼び出しに失敗しました');
    }
  };

  const handleManagerCall = async () => {
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、スタッフ呼び出しはできません');
      return;
    }
    try {
      // 出勤中のキャスト一覧を取得
      const response = await fetch('/api/casts?only_active=true');
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
    if (isTimeExpired) {
      error('エラー', 'セット時間が終了したため、スタッフ呼び出しはできません');
      return;
    }
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
        success('スタッフ呼び出し完了', '管理者に通知されました');
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
              message: 'スタッフ呼び出しリクエストが送信されました',
              priority: 'high'
            }),
          });
        } catch (notificationError) {
          console.error('通知送信エラー:', notificationError);
        }
      } else {
        error('エラー', result.error || 'スタッフ呼び出しに失敗しました');
      }
    } catch (err) {
      console.error('スタッフ呼び出しエラー:', err);
      error('エラー', 'スタッフ呼び出しに失敗しました');
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
      console.error('スタッフ呼び出し状態確認エラー:', err);
    }
  };

  const loadStaffCallStatus = async () => {
    if (!tableAuth || !isSessionActive) return;

    try {
      const currentSessionId = localStorage.getItem('current_session_id');
      if (!currentSessionId) return;

      const response = await fetch(`/api/callmanager?table_id=${tableAuth.table_id}&session_id=${currentSessionId}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        // calltypeが'service'のものを探す
        const serviceCall = result.data.find((call: any) => call.calltype === 'service');
        if (serviceCall) {
          const newStatus = serviceCall.status;
          setStaffCallStatus(newStatus);
          if (!staffCallId) {
            setStaffCallId(serviceCall.id.toString());
          }
        } else {
          setStaffCallStatus('none');
          setStaffCallId(null);
        }
      } else {
        setStaffCallStatus('none');
        setStaffCallId(null);
      }
    } catch (err) {
      console.error('スタッフ呼び出し状態確認エラー:', err);
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
              {isSessionActive && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleStaffCall('service', 'スタッフ呼び出し')}
                  className={`flex items-center text-xs sm:text-sm ${
                    staffCallStatus === 'pending' 
                      ? 'bg-orange-50 border-orange-300 text-orange-700' 
                      : staffCallStatus === 'accepted'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : ''
                  }`}
                  disabled={isTimeExpired || staffCallStatus === 'pending' || staffCallStatus === 'accepted'}
                >
                  {staffCallStatus === 'pending' ? (
                    <>
                      <Clock className="w-4 h-4 mr-1 animate-pulse" />
                      待機中...
                    </>
                  ) : staffCallStatus === 'accepted' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      承認済み
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-1" />
                      スタッフ呼び出し
                    </>
                  )}
                </Button>
              )}
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

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-0">
        <div className="flex gap-4 h-[calc(100vh-96px)]">
          {/* 左側（全幅の5/6） */}
          <div className="w-5/6 relative">
            <div className="absolute inset-0 pb-20 overflow-y-auto space-y-6">
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
                    <div className="space-y-2">
                      <Label htmlFor="guest-count">着席人数</Label>
                      <Input
                        id="guest-count"
                        type="number"
                        min="1"
                        placeholder="人数を入力してください"
                        value={guestCount}
                        onChange={(e) => {
                          const value = e.target.value;
                          setGuestCount(value);
                          // ローカルストレージに即座に保存
                          if (value.trim() !== '') {
                            localStorage.setItem('guest_count', value);
                          } else {
                            localStorage.removeItem('guest_count');
                          }
                        }}
                        className="w-full"
                      />
                      {tableAuth?.capacity && (
                        <p className="text-sm text-gray-500">
                          定員: {tableAuth.capacity}名まで
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={startSession}
                      disabled={!guestCount || guestCount.trim() === ''}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                {/* {isTimeExpired && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                    セット時間が終了しました。延長してから注文やサービスを実行してください。
                  </div>
                )} */}
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
                    {/* 注文 */}
                    {leftMode === 'order' && (
                        <div className={isTimeExpired ? 'pointer-events-none opacity-50' : ''}>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                          <Button
                            size="sm"
                            variant={selectedCategoryId === 'all' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategoryId('all')}
                          >
                            すべて
                          </Button>
                              {menuCategories.filter((c) => c.id !== 4).map((c) => (
                            <Button
                              key={c.id}
                              size="sm"
                              variant={selectedCategoryId === String(c.id) ? 'default' : 'outline'}
                              onClick={() => setSelectedCategoryId(String(c.id))}
                            >
                              {c.name}
                            </Button>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                              {(() => {
                                const items = selectedCategoryId === 'all'
                                  ? menuItems
                                  : menuItems.filter((it: any) => Number(it.category_id) === Number(selectedCategoryId));
                                if (!items || items.length === 0) {
                                  return (
                                <div className="col-span-3 lg:col-span-4 text-center text-sm text-gray-500 py-10">
                                        該当する商品がありません
                                </div>
                                  );
                                }
                                return items.map((item: any) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => { if (!isOrderingLocked && !isTimeExpired) addToCart(item); }}
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
                                  <div className="absolute right-1 bottom-1 bg-black/70 text-white text-[11px] px-2 py-1 rounded">
                                    {formatCurrency(item.sale_price)}
                                </div>
                                </div>
                                <div className="p-1.5">
                                  <div className="text-[13px] font-semibold leading-tight line-clamp-2">{item.name}</div>
                                  <div className="text-[11px] text-gray-500 mt-1">
                                    SKU: {item.sku ? item.sku : '-'}
                                  </div>
                                </div>
                              </button>
                            ));
                          })()}
                        </div>

                        {/* 左下：注文カートボタン（押すと横からモーダル表示） */}
                        <div className="fixed left-5 bottom-[132px] z-40">
                          {(() => {
                            const hasRequested = cartOrders.some((order: any) => {
                              const st = (orderRequestStatus as any)[order.id] || order.status;
                              return st === 'pending' || st === 'sent';
                            });
                            return (
                              <Button
                                onClick={() => setIsOrderCartOpen(true)}
                                className="h-16 w-16 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-lg hover:from-pink-600 hover:to-fuchsia-600 relative border-0"
                                variant="outline"
                              >
                                <ShoppingCart className="w-6 h-6" />
                                
                                {hasRequested && (
                                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full ring-2 ring-white" />
                                )}
                              </Button>
                            );
                          })()}
                        </div>

                        <Sheet open={isOrderCartOpen} onOpenChange={setIsOrderCartOpen}>
                          <SheetContent side="right" className="w-[420px] sm:max-w-md p-0">
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
                                <ScrollArea className="h-[70vh] pr-1">
                                  <div className="space-y-3">
                                    {cartOrders.map((order: any) => (
                                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                        <div className="flex-1">
                                          <h4 className="font-medium text-sm">{order.product_name}</h4>
                                          <p className="text-xs text-gray-500">
                                            ¥{order.unit_price?.toLocaleString()} × {order.amount}個
                                            {order.cast_name ? (
                                              <span className="ml-2 text-blue-600">(担当: {order.cast_name})</span>
                                            ) : (
                                              <span className="ml-2 text-gray-500">(お客様直接注文)</span>
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
                    )}

                    {/* 指定 */}
                    {leftMode === 'nomination' && (
                      <div className="grid grid-cols-3 gap-16">
                        <div className="ml-24 col-span-1 space-y-10">
                          <Button
                            size="lg"
                            className="w-full h-72 text-lg bg-purple-600 hover:bg-purple-700 relative overflow-hidden p-0"
                            disabled={isOrderingDisabled}
                            onClick={() => {
                              setCurrentNominationType('main');
                              localStorage.setItem('nomination_type', 'main');
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
                            <div className="relative z-10 w-full h-full flex items-center justify-center font-bold tracking-wide">
                              本 指 名
                            </div>
                          </Button>
                          <Button
                            size="lg"
                            className="w-full h-72 text-lg bg-blue-600 hover:bg-blue-700 relative overflow-hidden p-0"
                            disabled={isOrderingDisabled}
                            onClick={() => {
                              setCurrentNominationType('inside');
                              localStorage.setItem('nomination_type', 'inside');
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
                            <div className="relative z-10 w-full h-full flex items-center justify-center font-bold tracking-wide">
                              場 内 指 名
                            </div>
                          </Button>
                        </div>
                        <div className="col-span-2">
                      <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center">
                                <Users className="w-5 h-5 mr-2" />
                                指名リスト
                          </CardTitle>
                          </CardHeader>
                          <CardContent>
                              {isNominationsLoading ? (
                                <div className="text-sm text-gray-500">読み込み中...</div>
                              ) : nominations.length === 0 ? (
                                <div className="text-sm text-gray-500">指名はありません</div>
                              ) : (
                                <div className="space-y-3">
                                  {nominations.map((nomination: any) => (
                                    <div key={nomination.id} className="flex items-center justify-between border border-gray-200 bg-white px-3 py-2">
                                      <div>
                                        <div className="font-medium text-gray-900">{nomination.cast_name}</div>
                                        <div className="text-xs text-gray-500">
                                          {new Date(nomination.created_at).toLocaleString('ja-JP')}
                              </div>
                              </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge className={`${nominationBadgeStyle[nomination.type_id as 'main' | 'inside' | 'together'] || 'bg-gray-100 text-gray-700'}`}>
                                          {getNominationTypeLabel(nomination.type_id)}
                                        </Badge>
                                    <Button 
                                          size="sm"
                                      variant="outline"
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                          onClick={() => deleteNominationRecord(nomination.id)}
                                    >
                                          <Trash2 className="w-3 h-3" />
                                    </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        </div>
                      </div>
                    )}

                    {/* サービス */}
                    {leftMode === 'service' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-sm">
                                <Bell className="w-4 h-4 mr-1" />
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
                                <div className="space-y-2">
                                  {services.map((service: any) => (
                              <Button 
                                      key={service.id}
                                variant="outline"
                                      onClick={() => handleServiceOrder(service)}
                                disabled={isOrderingDisabled}
                                      className={`w-full h-14 justify-between ${isOrderingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                      <span className="text-base">{service.name}</span>
                                      <Utensils className="w-5 h-5" />
                              </Button>
                                  ))}
                            </div>
                              )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-sm">
                              <Coffee className="w-4 h-4 mr-1" />
                              追加注文
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                              <div className="space-y-2">
                              <Button 
                                variant="outline"
                                onClick={() => setShowBottleKeepDialog(true)}
                                disabled={isTimeExpired}
                                  className="w-full h-14 justify-between"
                              >
                                  <span className="text-base">ボトルキープ</span>
                                  <Wine className="w-5 h-5" />
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => setShowVipRoomDialog(true)}
                                disabled={isTimeExpired}
                                  className="w-full h-14 justify-between"
                              >
                                  <span className="text-base">VIPルーム</span>
                                  <Users className="w-5 h-5" />
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => setShowKaraokeDialog(true)}
                                disabled={isTimeExpired}
                                  className="w-full h-14 justify-between"
                              >
                                  <span className="text-base">カラオケ利用</span>
                                  <Users className="w-5 h-5" />
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
                                <ScrollArea className="h-[55vh] pr-1">
                              <div className="space-y-3">
                                {serviceOrders.map((order) => (
                                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">{order.service_name}</h4>
                                      <p className="text-xs text-gray-500">
                                        数量: {order.amount}個
                                        {order.cast_name ? (
                                              <span className="ml-2 text-blue-600">(担当: {order.cast_name})</span>
                                        ) : (
                                              <span className="ml-2 text-gray-500">(お客様直接注文)</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
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
                    )}
                              </div>
                            )}
                      </div>
                    )}
            </div>

            {/* 左下ナビ（黒帯 約80px） */}
            {isSessionActive && (
              <div className="absolute left-0 right-0 bottom-0 h-20 bg-[#303030] text-white flex items-center justify-around px-4">
                <Button
                  variant="ghost"
                  className="text-white text-[18px] hover:bg-white/10 gap-2"
                  onClick={() => router.push('/')}
                >
                  <FaHome /> 最初のページ
                </Button>
                <Button
                  variant="ghost"
                  className={`text-white text-[18px] gap-2 hover:bg-white/10 ${leftMode === 'order' ? 'bg-white/10' : ''}`}
                  onClick={() => setLeftMode('order')}
                >
                 <SiBuymeacoffee /> 注文
                </Button>
                <Button
                  variant="ghost"
                  className={`text-white text-[18px] gap-2 hover:bg-white/10 ${leftMode === 'nomination' ? 'bg-white/10' : ''}`}
                  onClick={() => setLeftMode('nomination')}
                >
                 <BiUserPin /> 指定
                </Button>
                <Button
                  variant="ghost"
                  className={`text-white text-[18px] gap-2 hover:bg-white/10 ${leftMode === 'service' ? 'bg-white/10' : ''}`}
                  onClick={() => setLeftMode('service')}
                >
                 <MdHomeRepairService /> サービス
                </Button>
              </div>
            )}
          </div>

          {/* カート・注文 */}
          {isSessionActive && (
            <div className="w-1/6 min-w-[260px] space-y-4">
            {/* セット延長 */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-semibold text-purple-800">
                  <Clock className="w-4 h-4 mr-2" />
                  セット延長
                </CardTitle>
              </CardHeader>
              <CardContent className="space-x-2 flex">
                <div className="w-1/2 bg-white rounded-md p-3 border border-purple-200 text-center relative">
                  <div className="text-[11px] text-gray-500 mb-1">残り時間</div>
                  {session?.is_paused && (
                    <div className="absolute top-1 right-1">
                      <span className="inline-flex items-center text-orange-700 border border-orange-200 px-2 py-0.5 text-[10px] font-semibold leading-none">
                        停止中
                      </span>
                    </div>
                  )}
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
                    <div>セット数: {localStorage.getItem('set_count') || 1}</div>
                    {/* <div>人数: {guestCount}名</div> */}
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

            {/* 合計・注文 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    注文合計
                  </CardTitle>
                {/* <CardDescription>
                  セッション料金・セット延長・承認済み商品の合計を表示します
                </CardDescription> */}
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
                
                {cartOrders.length === 0 && (!guestCount || guestCount.trim() === '') && setExtensions.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                    現在、表示できる料金情報がありません。商品追加または人数入力を行ってください。
                  </div>
                )}
                  
                  <div className="space-y-2">
                  {/* 商品の合計 */}
                  {(() => {
                    const productTotal = cartOrders.reduce((sum, order) => {
                      const status = orderRequestStatus[order.id] || order.status;
                      if (status === 'accepted') {
                        const price = Number(order.total_price);
                        const validPrice = isNaN(price) ? 0 : price;
                        return sum + validPrice;
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
                  
                  {/* セッション開始時の料金 */}
                  {(() => {
                    if (guestCount && guestCount.trim() !== '') {
                      const initialGuestCount = parseInt(guestCount);
                      if (!isNaN(initialGuestCount) && initialGuestCount > 0) {
                        const sessionFee = (addCharges['set_price'] || 0) * initialGuestCount;
                        return (
                          <div className="flex justify-between text-sm">
                            <span>セッション料金 ({guestCount}名)</span>
                            <span>{formatCurrency(sessionFee)}</span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                  
                  {/* セット延長料金 */}
                  {setExtensions.length > 0 && setExtensions.map((extension, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>セット延長 ({extension.count}名)</span>
                      <span>{formatCurrency(extension.price ?? ((addCharges['extension_price'] || 0) * extension.count))}</span>
                    </div>
                  ))}
                  
                  {/* 指名料金の明細 */}
                  {nominations.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <div className="text-xs font-semibold text-gray-600 mb-1">指名料金</div>
                      {nominations.map((nomination, index) => {
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
                    
                    // セッション開始時の料金
                    if (guestCount && guestCount.trim() !== '') {
                      const initialGuestCount = parseInt(guestCount);
                      if (!isNaN(initialGuestCount) && initialGuestCount > 0) {
                        subtotal += (addCharges['set_price'] || 0) * initialGuestCount;
                      }
                    }
                    
                    // セット延長料金
                    setExtensions.forEach(extension => {
                      if (extension.count > 0) {
                        subtotal += (extension.price ?? ((addCharges['extension_price'] || 0) * extension.count));
                      }
                    });
                    
                    // 指名料金（DBのnomination.cost累計）
                    nominations.forEach(nomination => {
                      const cost = Number((nomination as any).cost);
                      subtotal += Number.isFinite(cost) ? cost : 0;
                    });
                    
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
                  
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>合計</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {isPaymentCompleted ? (
                      <div className="w-full bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center space-x-2 text-green-700">
                          <CheckCircle className="w-6 h-6" />
                          <span className="font-bold text-lg">決済成功</span>
                        </div>
                        <div className="text-sm text-green-600 mt-1">
                          支払いが完了しました
                        </div>
                        <div className="text-lg font-bold text-green-700 mt-2">
                          {formatCurrency(parseInt(localStorage.getItem('paid_amount') || '0'))}
                        </div>
                      </div>
                    ) : null}
                    

                  </div>
                </CardContent>
              </Card>


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
              <Button onClick={handleServiceOrderSubmit} disabled={isOrderingDisabled}>
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
                {selectedNominationType ? (selectedNominationType === 'nomination' ? '本指名' : '場内指名') : '指名'}登録
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
                    <span>{selectedNominationType ? (selectedNominationType === 'nomination' ? '本指名' : '場内指名') : '未選択'}</span>
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
                disabled={isOrderingDisabled || !fieldNominationCast}
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

              {/* キャスト用として注文 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="for-cast"
                  checked={isForCast}
                  onChange={(e) => {
                    setIsForCast(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedCast('none');
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
                  value={selectedCast} 
                  onValueChange={setSelectedCast}
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
                  {(selectedService.description || selectedService.other) && (
                    <p className="text-sm text-gray-600">{selectedService.description || selectedService.other}</p>
                  )}
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
                disabled={isOrderingDisabled || !selectedService || serviceOrderQuantity < 1}
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
                {currentNominationType ? getNominationTypeLabel(currentNominationType) : '指名'} - キャスト選択
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
                        {cast.name} 
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
                    <span>{currentNominationType ? getNominationTypeLabel(currentNominationType) : '未設定'}</span>
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
                onClick={handleStoreCreditCardPayment}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="lg"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                店舗用クレジットカード決済 
              </Button>
              
              <Button
                onClick={handleCashPayment}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                size="lg"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                現金で決済 ({formatCurrency(calculateTotal())})
              </Button>
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
              
              <div className="flex justify-end space-x-2">
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
                  disabled={!storeCreditCardPaymentAmount || parseFloat(storeCreditCardPaymentAmount) < calculateTotal()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  確認
                </Button>
              </div>
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
                受け取った金額を入力してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cash-amount">受け取った金額</Label>
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
              
              <div className="flex justify-end space-x-2">
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
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  確認
                </Button>
              </div>
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

        {/* スタッフ呼び出しキャスト選択ダイアログ */}
        <Dialog open={showManagerCallDialog} onOpenChange={setShowManagerCallDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                スタッフ呼び出し - キャスト選択
              </DialogTitle>
              <DialogDescription>
                スタッフ呼び出しを行うキャストを選択してください
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

        {/* スタッフ呼び出しキャスト選択ダイアログ */}
        <Dialog open={showStaffCallDialog} onOpenChange={setShowStaffCallDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                スタッフ呼び出し - キャスト選択
              </DialogTitle>
              <DialogDescription>
                スタッフ呼び出しを行うキャストを選択してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>キャスト選択</Label>
                {isCastsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">キャストを読み込み中...</p>
                  </div>
                ) : casts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>キャストがありません</p>
                  </div>
                ) : (
                  <Select value={selectedCastForStaffCall} onValueChange={setSelectedCastForStaffCall}>
                    <SelectTrigger>
                      <SelectValue placeholder="キャストを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {casts.map((cast) => (
                        <SelectItem key={cast.id} value={cast.id.toString()}>
                          {cast.name} {cast.mail ? `(${cast.mail})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {/* スタッフ呼び出し情報表示 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">スタッフ呼び出し情報</h4>
                <div className="space-y-1 text-sm">
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
                  setShowStaffCallDialog(false);
                  setSelectedCastForStaffCall('');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleStaffCallConfirm}
                disabled={isCastsLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                確認
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ボトルキープダイアログ */}
        <Dialog open={showBottleKeepDialog} onOpenChange={setShowBottleKeepDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Wine className="w-5 h-5 mr-2" />
                ボトルキープ登録
              </DialogTitle>
              <DialogDescription>
                ボトルキープの情報を入力してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">顧客名 *</Label>
                <Input
                  id="client-name"
                  type="text"
                  placeholder="顧客名を入力"
                  value={bottleKeepData.clientName}
                  onChange={(e) => setBottleKeepData({...bottleKeepData, clientName: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-email">顧客メールアドレス</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="メールアドレスを入力"
                  value={bottleKeepData.clientEmail}
                  onChange={(e) => setBottleKeepData({...bottleKeepData, clientEmail: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bottle-name">ボトル名 *</Label>
                <Input
                  id="bottle-name"
                  type="text"
                  placeholder="ボトル名を入力"
                  value={bottleKeepData.bottleName}
                  onChange={(e) => setBottleKeepData({...bottleKeepData, bottleName: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bottle-amount">残量 (ml) *</Label>
                <Input
                  id="bottle-amount"
                  type="number"
                  min="0"
                  placeholder="残量を入力"
                  value={bottleKeepData.amount}
                  onChange={(e) => setBottleKeepData({...bottleKeepData, amount: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bottle-other">備考</Label>
                <Input
                  id="bottle-other"
                  type="text"
                  placeholder="備考を入力"
                  value={bottleKeepData.other}
                  onChange={(e) => setBottleKeepData({...bottleKeepData, other: e.target.value})}
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-blue-700">
                  ボトルキープ料金: {formatCurrency(addCharges['bottle_keep'] || 0)}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBottleKeepDialog(false);
                  setBottleKeepData({
                    clientName: '',
                    clientEmail: '',
                    bottleName: '',
                    amount: '',
                    other: ''
                  });
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleBottleKeepConfirm}
                disabled={isOrderingDisabled || !bottleKeepData.clientName || !bottleKeepData.bottleName || !bottleKeepData.amount}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                登録
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* VIPルームダイアログ */}
        <Dialog open={showVipRoomDialog} onOpenChange={setShowVipRoomDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                個室利用（VIPルーム）
              </DialogTitle>
              <DialogDescription>
                利用する部屋数を入力してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vip-room-count">部屋数</Label>
                <Input
                  id="vip-room-count"
                  type="number"
                  min="1"
                  placeholder="部屋数を入力してください"
                  value={vipRoomCount}
                  onChange={(e) => setVipRoomCount(e.target.value)}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  料金: {vipRoomCount && !isNaN(parseInt(vipRoomCount)) && parseInt(vipRoomCount) > 0
                    ? formatCurrency((addCharges['vip_room'] || 0) * parseInt(vipRoomCount))
                    : formatCurrency(0)}
                </p>
                </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVipRoomDialog(false);
                  setVipRoomCount('');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleVipRoomConfirm}
                disabled={isOrderingDisabled || !vipRoomCount || parseInt(vipRoomCount) <= 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                確認
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* カラオケダイアログ */}
        <Dialog open={showKaraokeDialog} onOpenChange={setShowKaraokeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                カラオケ利用
              </DialogTitle>
              <DialogDescription>
                歌う曲数を入力してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="karaoke-count">曲数</Label>
                <Input
                  id="karaoke-count"
                  type="number"
                  min="1"
                  placeholder="曲数を入力してください"
                  value={karaokeSongCount}
                  onChange={(e) => setKaraokeSongCount(e.target.value)}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  料金: {karaokeSongCount && !isNaN(parseInt(karaokeSongCount)) && parseInt(karaokeSongCount) > 0
                    ? formatCurrency((addCharges['song_room'] || 0) * parseInt(karaokeSongCount))
                    : formatCurrency(0)}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowKaraokeDialog(false);
                  setKaraokeSongCount('');
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleKaraokeConfirm}
                disabled={isOrderingDisabled || !karaokeSongCount || parseInt(karaokeSongCount) <= 0}
                className="bg-pink-600 hover:bg-pink-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                確認
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}