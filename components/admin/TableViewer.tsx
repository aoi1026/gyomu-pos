'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Clock, ShoppingCart, Utensils, Users, DollarSign, CheckCircle, Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/mock-data';

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
  set_extensions?: Array<{ count: number; timestamp: number }>;
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
  created_at: string;
}

export default function TableViewer({ tableId, onClose }: TableViewerProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [cartOrders, setCartOrders] = useState<CartOrder[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [setExtensionCountdown, setSetExtensionCountdown] = useState<number>(0);
  const [setExtensions, setSetExtensions] = useState<Array<{ count: number; timestamp: number }>>([]);
  const [guestCount, setGuestCount] = useState<string>('');
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
          // セッション情報が変更された場合のみ更新
          setSession(prev => {
            if (prev?.id !== activeSession.id || 
                prev?.set_count !== activeSession.set_count ||
                prev?.client !== activeSession.client) {
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
              loadAddCharges()
            ]);
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
      const response = await fetch(`/api/nominations?session_id=${sessionId}`);
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
      const elapsed = Math.floor((now - sessionStart) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      
      setSetExtensionCountdown(remaining);
    };
    
    // 初回更新
    updateCountdown();
    
    // 1秒ごとに更新
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [session]);

  // データを読み込む
  useEffect(() => {
    if (tableId) {
      loadSession();
    }
  }, [tableId]);

  // 定期的にデータを更新（リアルタイム更新）
  useEffect(() => {
    if (!session) return;
    
    // 初回読み込み
    loadSession();
    loadCartOrders(session.id);
    loadServiceOrders(session.id);
    loadNominations(session.id);
    
    // 1秒ごとに更新
    const interval = setInterval(() => {
      loadSession();
      loadCartOrders(session.id);
      loadServiceOrders(session.id);
      loadNominations(session.id);
    }, 1000); // 1秒ごとに更新
    
    return () => clearInterval(interval);
  }, [session?.id, tableId]);

  if (!tableId) return null;

  // 指名料金の合計を計算（テーブルページと同じロジック）
  const calculateNominationCharges = (): number => {
    let total = 0;
    
    nominations.forEach(nomination => {
      let charge = 0;
      if (nomination.type_id === 'together') {
        const mainCharge = addCharges['main'] || 0;
        const togetherCharge = addCharges['together'] || 0;
        charge = mainCharge + togetherCharge;
      } else if (nomination.type_id === 'main') {
        charge = addCharges['main'] || 0;
      } else if (nomination.type_id === 'inside') {
        charge = addCharges['inside'] || 0;
      }
      total += charge;
    });
    
    // セット延長回数分の指名料金
    const extensionCount = setExtensions.length;
    if (extensionCount > 0 && nominations.length > 0) {
      nominations.forEach(nomination => {
        let chargePerExtension = 0;
        if (nomination.type_id === 'together' || nomination.type_id === 'main') {
          chargePerExtension = addCharges['main'] || 0;
        } else if (nomination.type_id === 'inside') {
          chargePerExtension = addCharges['inside'] || 0;
        }
        total += chargePerExtension * extensionCount;
      });
    }
    
    return total;
  };

  // 注文合計を計算（テーブルページと同じロジック）
  const calculateTotal = () => {
    let subtotal = 0;
    
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
        subtotal += 5000 * initialGuestCount;
      }
    }
    
    // セット延長料金
    setExtensions.forEach(extension => {
      if (extension.count > 0) {
        subtotal += 5000 * extension.count;
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
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
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 左側: セット延長、注文カート、サービス注文カート */}
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
                      <div className="text-2xl font-bold text-purple-600 leading-none">
                        {Math.floor(setExtensionCountdown / 60)}:{(setExtensionCountdown % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {Math.floor(setExtensionCountdown / 60)}分 {setExtensionCountdown % 60}秒
                      </div>
                    </div>
                    <div className="w-1/2 flex flex-col justify-center">
                      <div className="text-sm text-gray-700">
                        <div>セット数: {session.set_count}</div>
                        <div>人数: {session.client}名</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                                {orderRequestStatus[order.id] === 'pending' && (
                                  <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
                                )}
                                {orderRequestStatus[order.id] === 'sent' && (
                                  <Bell className="w-4 h-4 text-blue-500 animate-bounce" />
                                )}
                                {orderRequestStatus[order.id] === 'accepted' && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {(orderRequestStatus[order.id] as string) === 'rejected' && (
                                  <X className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

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
                      <ScrollArea className="h-[30vh] pr-1">
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
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 右側: 指名リスト、注文合計 */}
              <div className="space-y-6">
                {/* 指名リスト */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      指名リスト
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {nominations.length === 0 ? (
                      <div className="text-sm text-gray-500">指名はありません</div>
                    ) : (
                      <ScrollArea className="h-[30vh] pr-1">
                        <div className="space-y-3">
                          {nominations.map((nomination) => (
                            <div key={nomination.id} className="flex items-center justify-between border border-gray-200 bg-white px-3 py-2 rounded-lg">
                              <div>
                                <div className="font-medium text-gray-900">{nomination.cast_name}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(nomination.created_at).toLocaleString('ja-JP')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={nominationBadgeStyle[nomination.type_id] || 'bg-gray-100 text-gray-700'}>
                                  {getNominationTypeLabel(nomination.type_id)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* 注文合計 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      注文合計
                    </CardTitle>
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
                          <span>{formatCurrency(5000 * parseInt(guestCount || '0'))}</span>
                        </div>
                      )}

                      {/* セット延長料金 */}
                      {setExtensions.map((extension, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>セット延長 ({extension.count}名)</span>
                          <span>{formatCurrency(5000 * extension.count)}</span>
                        </div>
                      ))}

                      {/* 指名料金の明細 */}
                      {nominations.length > 0 && (
                        <div className="border-t pt-2 space-y-1">
                          <div className="text-xs font-semibold text-gray-600 mb-1">指名料金</div>
                          {nominations.map((nomination) => {
                            let charge = 0;
                            let chargeLabel = '';
                            
                            if (nomination.type_id === 'together') {
                              const mainCharge = addCharges['main'] || 0;
                              const togetherCharge = addCharges['together'] || 0;
                              charge = mainCharge + togetherCharge;
                              chargeLabel = `${getNominationTypeLabel(nomination.type_id)} - ${nomination.cast_name}`;
                            } else if (nomination.type_id === 'main') {
                              charge = addCharges['main'] || 0;
                              chargeLabel = `${getNominationTypeLabel(nomination.type_id)} - ${nomination.cast_name}`;
                            } else if (nomination.type_id === 'inside') {
                              charge = addCharges['inside'] || 0;
                              chargeLabel = `${getNominationTypeLabel(nomination.type_id)} - ${nomination.cast_name}`;
                            }
                            
                            return (
                              <div key={nomination.id} className="flex justify-between text-sm pl-3">
                                <span className="text-gray-700">{chargeLabel}</span>
                                <span>{formatCurrency(charge)}</span>
                              </div>
                            );
                          })}
                          
                          {/* セット延長時の指名料金 */}
                          {(() => {
                            // セット延長回数分の指名料金を計算
                            const extensionCount = setExtensions.length;
                            if (extensionCount > 0 && nominations.length > 0) {
                              let extensionNominationTotal = 0;
                              nominations.forEach(nomination => {
                                let chargePerExtension = 0;
                                if (nomination.type_id === 'together' || nomination.type_id === 'main') {
                                  chargePerExtension = addCharges['main'] || 0;
                                } else if (nomination.type_id === 'inside') {
                                  chargePerExtension = addCharges['inside'] || 0;
                                }
                                extensionNominationTotal += chargePerExtension * extensionCount;
                              });
                              
                              if (extensionNominationTotal > 0) {
                                return (
                                  <div className="flex justify-between text-sm pl-3 border-t pt-1 mt-1">
                                    <span className="text-gray-700">指名料金（延長 × {extensionCount}回）</span>
                                    <span>{formatCurrency(extensionNominationTotal)}</span>
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
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
                            subtotal += 5000 * initialGuestCount;
                          }
                        }
                        
                        // セット延長料金
                        setExtensions.forEach(extension => {
                          if (extension.count > 0) {
                            subtotal += 5000 * extension.count;
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
                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>合計</span>
                        <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                      </div>
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
    </div>
  );
}
