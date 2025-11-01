// スタッフ呼び出しシステム
export interface StaffCall {
  id: string;
  table_id: string;
  table_label: string;
  call_type: 'service' | 'manager' | 'security' | 'emergency';
  message: string;
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled';
  created_at: string;
  acknowledged_at?: string;
  completed_at?: string;
  acknowledged_by?: string;
  completed_by?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ServiceOrder {
  id: string;
  table_id: string;
  table_label: string;
  service_type: 'towel' | 'ashtray' | 'glass' | 'chopsticks' | 'other';
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  completed_by?: string;
  note?: string;
}

// モックデータ
export const mockStaffCalls: StaffCall[] = [
  {
    id: 'call-1',
    table_id: 'table-1',
    table_label: 'テーブル 1',
    call_type: 'service',
    message: 'おしぼりをお願いします',
    status: 'pending',
    created_at: '2025-01-20T20:30:00Z',
    priority: 'medium'
  },
  {
    id: 'call-2',
    table_id: 'table-2',
    table_label: 'テーブル 2',
    call_type: 'manager',
    message: '店長をお呼びください',
    status: 'acknowledged',
    created_at: '2025-01-20T20:25:00Z',
    acknowledged_at: '2025-01-20T20:26:00Z',
    acknowledged_by: 'staff-2',
    priority: 'high'
  }
];

export const mockServiceOrders: ServiceOrder[] = [
  {
    id: 'service-1',
    table_id: 'table-1',
    table_label: 'テーブル 1',
    service_type: 'towel',
    quantity: 2,
    status: 'pending',
    created_at: '2025-01-20T20:30:00Z',
    note: '温かいおしぼりでお願いします'
  },
  {
    id: 'service-2',
    table_id: 'table-2',
    table_label: 'テーブル 2',
    service_type: 'ashtray',
    quantity: 1,
    status: 'completed',
    created_at: '2025-01-20T20:25:00Z',
    completed_at: '2025-01-20T20:27:00Z',
    completed_by: 'staff-3'
  }
];

// スタッフ呼び出しを作成
export const createStaffCall = async (
  tableId: string,
  tableLabel: string,
  callType: StaffCall['call_type'],
  message: string,
  priority: StaffCall['priority'] = 'medium'
): Promise<StaffCall> => {
  const newCall: StaffCall = {
    id: `call-${Date.now()}`,
    table_id: tableId,
    table_label: tableLabel,
    call_type: callType,
    message,
    status: 'pending',
    created_at: new Date().toISOString(),
    priority
  };

  // 実際のAPIでは保存処理
  console.log('Creating staff call:', newCall);
  
  return newCall;
};

// サービス注文を作成
export const createServiceOrder = async (
  tableId: string,
  tableLabel: string,
  serviceType: ServiceOrder['service_type'],
  quantity: number,
  note?: string
): Promise<ServiceOrder> => {
  const newOrder: ServiceOrder = {
    id: `service-${Date.now()}`,
    table_id: tableId,
    table_label: tableLabel,
    service_type: serviceType,
    quantity,
    status: 'pending',
    created_at: new Date().toISOString(),
    note
  };

  // 実際のAPIでは保存処理
  console.log('Creating service order:', newOrder);
  
  return newOrder;
};

// 呼び出しを承認
export const acknowledgeCall = async (callId: string, staffId: string): Promise<void> => {
  console.log('Acknowledging call:', callId, 'by staff:', staffId);
  // 実際のAPIでは更新処理
};

// 呼び出しを完了
export const completeCall = async (callId: string, staffId: string): Promise<void> => {
  console.log('Completing call:', callId, 'by staff:', staffId);
  // 実際のAPIでは更新処理
};

// サービス注文を完了
export const completeServiceOrder = async (orderId: string, staffId: string): Promise<void> => {
  console.log('Completing service order:', orderId, 'by staff:', staffId);
  // 実際のAPIでは更新処理
};

// 呼び出しタイプのラベル
export const getCallTypeLabel = (callType: StaffCall['call_type']): string => {
  const labels = {
    service: 'サービス',
    manager: '店長呼び出し',
    security: 'セキュリティ',
    emergency: '緊急事態'
  };
  return labels[callType];
};

// サービスタイプのラベル
export const getServiceTypeLabel = (serviceType: ServiceOrder['service_type']): string => {
  const labels = {
    towel: 'おしぼり',
    ashtray: '灰皿交換',
    glass: 'グラス',
    chopsticks: 'お箸',
    other: 'その他'
  };
  return labels[serviceType];
};

// 優先度のラベル
export const getPriorityLabel = (priority: StaffCall['priority']): string => {
  const labels = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急'
  };
  return labels[priority];
};

// 優先度の色
export const getPriorityColor = (priority: StaffCall['priority']): string => {
  const colors = {
    low: 'text-gray-600 bg-gray-100',
    medium: 'text-blue-600 bg-blue-100',
    high: 'text-orange-600 bg-orange-100',
    urgent: 'text-red-600 bg-red-100'
  };
  return colors[priority];
};
