// 注文監視システム
export interface OrderNotification {
  id: string;
  table_id: string;
  table_label: string;
  order_type: 'drink' | 'food' | 'bottle' | 'service' | 'staff_call' | 'nomination';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  acknowledged_at?: string;
  completed_at?: string;
  acknowledged_by?: string;
  completed_by?: string;
  assigned_to?: string; // 担当者
  estimated_time?: number; // 予想処理時間（分）
}

export interface StaffAssignment {
  staff_id: string;
  staff_name: string;
  role: 'kitchen' | 'bar' | 'service' | 'manager' | 'cast';
  is_available: boolean;
  current_orders: number;
  max_orders: number;
}

// モックデータ - mock-data.tsと同期
export const mockStaffAssignments: StaffAssignment[] = [
  {
    staff_id: 'staff-1',
    staff_name: '田中美咲',
    role: 'cast',
    is_available: true,
    current_orders: 0,
    max_orders: 3
  },
  {
    staff_id: 'staff-2',
    staff_name: '佐藤花音',
    role: 'cast',
    is_available: true,
    current_orders: 1,
    max_orders: 3
  },
  {
    staff_id: 'staff-3',
    staff_name: '鈴木愛美',
    role: 'cast',
    is_available: true,
    current_orders: 2,
    max_orders: 3
  },
  {
    staff_id: 'staff-4',
    staff_name: '高橋麻衣',
    role: 'cast',
    is_available: true,
    current_orders: 1,
    max_orders: 3
  },
  {
    staff_id: 'admin-1',
    staff_name: '山田店長',
    role: 'manager',
    is_available: true,
    current_orders: 0,
    max_orders: 10
  }
];

export const mockOrderNotifications: OrderNotification[] = [
  {
    id: 'notif-1',
    table_id: 'table-1',
    table_label: 'テーブル1',
    order_type: 'drink',
    message: 'シャンパン グラス 2杯、ウイスキー ロック 1杯',
    priority: 'medium',
    status: 'pending',
    created_at: '2025-01-20T20:30:00Z',
    estimated_time: 5
  },
  {
    id: 'notif-2',
    table_id: 'table-2',
    table_label: 'テーブル2',
    order_type: 'service',
    message: 'おしぼり 2個',
    priority: 'low',
    status: 'acknowledged',
    created_at: '2025-01-20T20:25:00Z',
    acknowledged_at: '2025-01-20T20:26:00Z',
    acknowledged_by: 'staff-1',
    assigned_to: 'staff-1',
    estimated_time: 2
  },
  {
    id: 'notif-3',
    table_id: 'table-4',
    table_label: 'テーブル4',
    order_type: 'bottle',
    message: 'ドンペリニヨン ヴィンテージ 1本',
    priority: 'high',
    status: 'in_progress',
    created_at: '2025-01-20T21:15:00Z',
    acknowledged_at: '2025-01-20T21:16:00Z',
    acknowledged_by: 'staff-2',
    assigned_to: 'staff-2',
    estimated_time: 10
  }
];

// 注文通知を作成
export const createOrderNotification = async (
  tableId: string,
  tableLabel: string,
  orderType: OrderNotification['order_type'],
  message: string,
  priority: OrderNotification['priority'] = 'medium',
  estimatedTime?: number
): Promise<OrderNotification> => {
  const newNotification: OrderNotification = {
    id: `notif-${Date.now()}`,
    table_id: tableId,
    table_label: tableLabel,
    order_type: orderType,
    message,
    priority,
    status: 'pending',
    created_at: new Date().toISOString(),
    estimated_time: estimatedTime
  };

  // 実際のAPIでは保存処理
  console.log('Creating order notification:', newNotification);
  
  return newNotification;
};

// 自動割り当て
export const autoAssignOrder = (notification: OrderNotification): string | null => {
  const availableStaff = mockStaffAssignments.filter(staff => 
    staff.is_available && 
    staff.current_orders < staff.max_orders &&
    isStaffSuitableForOrder(staff, notification)
  );

  if (availableStaff.length === 0) return null;

  // 優先度と現在の負荷でソート
  availableStaff.sort((a, b) => {
    const aLoad = a.current_orders / a.max_orders;
    const bLoad = b.current_orders / b.max_orders;
    return aLoad - bLoad;
  });

  return availableStaff[0].staff_id;
};

// スタッフが注文に適しているかチェック
const isStaffSuitableForOrder = (staff: StaffAssignment, notification: OrderNotification): boolean => {
  switch (notification.order_type) {
    case 'drink':
    case 'bottle':
      return staff.role === 'bar' || staff.role === 'cast';
    case 'food':
      return staff.role === 'kitchen';
    case 'service':
      return staff.role === 'service' || staff.role === 'cast';
    case 'staff_call':
      return staff.role === 'manager' || staff.role === 'cast';
    case 'nomination':
      return staff.role === 'cast';
    default:
      return true;
  }
};

// 通知を承認
export const acknowledgeNotification = async (notificationId: string, staffId: string): Promise<void> => {
  console.log('Acknowledging notification:', notificationId, 'by staff:', staffId);
  // 実際のAPIでは更新処理
};

// 通知を完了
export const completeNotification = async (notificationId: string, staffId: string): Promise<void> => {
  console.log('Completing notification:', notificationId, 'by staff:', staffId);
  // 実際のAPIでは更新処理
};

// 優先度のラベル
export const getPriorityLabel = (priority: OrderNotification['priority']): string => {
  const labels = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急'
  };
  return labels[priority];
};

// 優先度の色
export const getPriorityColor = (priority: OrderNotification['priority']): string => {
  const colors = {
    low: 'text-gray-600 bg-gray-100',
    medium: 'text-blue-600 bg-blue-100',
    high: 'text-orange-600 bg-orange-100',
    urgent: 'text-red-600 bg-red-100'
  };
  return colors[priority];
};

// 注文タイプのラベル
export const getOrderTypeLabel = (orderType: OrderNotification['order_type']): string => {
  const labels = {
    drink: 'ドリンク',
    food: '料理',
    bottle: 'ボトル',
    service: 'サービス',
    staff_call: 'スタッフ呼び出し',
    nomination: '指名'
  };
  return labels[orderType];
};

// 注文タイプのアイコン
export const getOrderTypeIcon = (orderType: OrderNotification['order_type']): string => {
  const icons = {
    drink: '🍺',
    food: '🍽️',
    bottle: '🍷',
    service: '🛎️',
    staff_call: '📞',
    nomination: '⭐'
  };
  return icons[orderType];
};
