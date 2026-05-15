/**
 * テーブル画面の localStorage に保存されるセッション関連キーを一括削除する。
 * セッション取消時は顧客数（guest_count）を含め、次の着席で復元されないようにする。
 */
export function clearSessionLocalStorage(sessionId?: string | number | null): void {
  if (typeof window === 'undefined') return;

  const sid = sessionId != null ? String(sessionId) : null;
  if (sid) {
    localStorage.removeItem(`cart_orders_${sid}`);
    localStorage.removeItem(`service_orders_${sid}`);
  }

  const keys = [
    'current_session_id',
    'guest_count',
    'set_count',
    'set_extensions',
    'set_extension_start_time',
    'set_extension_total_seconds',
    'nomination_charges',
    'additional_services',
    'payment_completed',
    'paid_amount',
    'cost',
    'fullcost',
    'nomination_type',
    'service_orders',
    'cart_orders',
  ];
  for (const key of keys) {
    localStorage.removeItem(key);
  }

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('cart_orders_') || key.startsWith('service_orders_')) {
      localStorage.removeItem(key);
    }
  });
}
