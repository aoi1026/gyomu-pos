// モックデータ - 将来のAPI統合に備えた構造
export interface Store {
  id: string;
  name: string;
  tax_bp: number; // basis points (1000 = 10%)
  service_charge_bp: number;
  closing_time: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  store_id: string;
  name: string;
  email?: string;
  phone?: string;
  rank?: string;
  hourly_wage_yen: number;
  active: boolean;
  roles: string[];
}

export interface Customer {
  id: string;
  store_id: string;
  display_name: string;
  email?: string;
  note?: string;
  blacklist: boolean;
  main_nomination_cast_id?: string; // 本指名キャストID
  main_nomination_cast_name?: string; // 本指名キャスト名
  nomination_history: NominationHistory[]; // 指名履歴
  created_at: string;
}

export interface NominationHistory {
  id: string;
  customer_id: string;
  cast_id: string;
  cast_name: string;
  nomination_type: 'main' | 'field' | 'promotion'; // main: 本指名, field: 場内指名, promotion: 昇格
  started_at: string;
  ended_at?: string;
  notes?: string;
}

export interface TableSeat {
  id: string;
  store_id: string;
  label: string;
  capacity: number;
  active: boolean;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  area?: string; // メインフロア, VIP, カウンター, 個室
  last_updated?: string;
  session_start?: string;
  estimated_checkout?: string;
  customer_name?: string;
  staff_assigned?: string;
  note?: string;
}

export interface MenuCategory {
  id: string;
  store_id: string;
  name: string;
  service_charge_applicable: boolean;
  tax_applicable: boolean;
  bottle_back_applicable: boolean;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  sku?: string;
  is_bottle: boolean;
  is_active: boolean;
  tax_category: string;
  current_price_yen: number;
  image_url?: string;
}

export interface ServiceSession {
  id: string;
  store_id: string;
  table_seat_id: string;
  customer_id?: string;
  opened_at: string;
  closed_at?: string;
  business_date: string;
  status: 'open' | 'settled' | 'void';
  // Multi-cast support: track all participating casts
  participating_casts: SessionCast[];
}

export interface SessionCast {
  staff_id: string;
  joined_at: string;
  left_at?: string;
  is_primary: boolean; // Primary cast for the session
}

export interface Order {
  id: string;
  store_id: string;
  session_id: string;
  table_seat_id: string; // Required for table-first approach
  customer_id?: string;
  subtotal_yen: number;
  service_charge_yen: number;
  tax_yen: number;
  discount_yen: number;
  total_yen: number;
  service_charge_bp?: number;
  tax_bp?: number;
  status: 'draft' | 'confirmed' | 'void';
  note?: string;
  created_at: string;
  confirmed_at?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  unit_price_yen: number;
  line_subtotal_yen: number;
  canceled: boolean;
  note?: string;
  cast_id?: string; // Optional cast assignment per item
  cast_name?: string; // キャスト名
  nomination_type?: 'main' | 'field' | 'free'; // 指名区分: main=本指名, field=場内指名, free=フリー
  menu_item: MenuItem;
}

export interface Payment {
  id: string;
  store_id: string;
  order_id: string;
  method: 'cash' | 'card_external' | 'qr_external';
  amount_yen: number;
  recorded_by_staff_id?: string;
  paid_at: string;
}

export interface Attendance {
  id: string;
  store_id: string;
  staff_id: string;
  clock_in: string;
  clock_out?: string;
  break_minutes: number;
  note?: string;
  status: 'pending' | 'locked' | 'approved';
}

export interface Bottle {
  id: string;
  store_id: string;
  menu_item_id: string;
  name: string;
  remaining_ml: number;
  total_ml: number;
  expires_at: string;
  status: 'active' | 'empty' | 'expired';
  created_at: string;
}

export interface Reservation {
  id: string;
  store_id: string;
  customer_id: string;
  table_seat_id: string;
  start_at: string;
  end_at: string;
  party_size: number;
  note?: string;
  status: 'booked' | 'arrived' | 'cancelled' | 'no_show';
  created_at: string;
}

export interface Shift {
  id: string;
  store_id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: 'draft' | 'published' | 'confirmed';
  note?: string;
}

export interface PayrollRun {
  id: string;
  store_id: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'confirmed' | 'paid';
  total_amount_yen: number;
  created_at: string;
  confirmed_at?: string;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  staff_id: string;
  base_hours: number;
  base_wage_yen: number;
  nomination_count: number;
  nomination_amount_yen: number;
  bottle_sales_yen: number;
  bottle_back_yen: number;
  overtime_hours: number;
  overtime_wage_yen: number;
  deduction_yen: number;
  total_yen: number;
  staff: Staff;
}

export interface RegisterClose {
  id: string;
  store_id: string;
  business_date: string;
  cash_expected_yen: number;
  cash_actual_yen: number;
  difference_yen: number;
  note?: string;
  closed_by_staff_id: string;
  closed_at: string;
}

export interface AuditLog {
  id: string;
  store_id: string;
  actor_staff_id?: string;
  entity: string;
  entity_id: string;
  action: string;
  diff: any;
  created_at: string;
}
// モックデータ
export const mockStore: Store = {
  id: 'store-1',
  name: '銀座エレガンス',
  tax_bp: 1000, // 10%
  service_charge_bp: 1500, // 15%
  closing_time: '05:00',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

// 複数店舗のモックデータ
export const mockStores: Store[] = [
  mockStore,
  {
    id: 'store-2',
    name: '六本木プレミアム',
    tax_bp: 1000,
    service_charge_bp: 2000, // 20%
    closing_time: '06:00',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'store-3',
    name: '新宿ラウンジ',
    tax_bp: 1000,
    service_charge_bp: 1200, // 12%
    closing_time: '04:00',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];
export const mockStaff: Staff[] = [
  // 銀座エレガンス - スタッフ
  {
    id: 'staff-1',
    store_id: 'store-1',
    name: '田中美咲',
    email: 'tanaka@example.com',
    phone: '090-1234-5678',
    rank: 'キャスト',
    hourly_wage_yen: 2500,
    active: true,
    roles: ['cast']
  },
  {
    id: 'staff-2',
    store_id: 'store-1',
    name: '佐藤花音',
    email: 'sato@example.com',
    phone: '090-2345-6789',
    rank: 'ホール',
    hourly_wage_yen: 1800,
    active: true,
    roles: ['cast']
  },
  {
    id: 'staff-3',
    store_id: 'store-1',
    name: '鈴木愛美',
    email: 'suzuki@example.com',
    phone: '090-3456-7890',
    rank: 'キャスト',
    hourly_wage_yen: 3000,
    active: true,
    roles: ['cast']
  },
  {
    id: 'staff-4',
    store_id: 'store-1',
    name: '高橋麻衣',
    email: 'takahashi@example.com',
    phone: '090-4567-8901',
    rank: 'レジ',
    hourly_wage_yen: 1500,
    active: true,
    roles: ['cast']
  },
  // 銀座エレガンス - 管理者
  {
    id: 'admin-1',
    store_id: 'store-1',
    name: '山田店長',
    email: 'yamada@example.com',
    phone: '090-3456-7890',
    rank: '店長',
    hourly_wage_yen: 0,
    active: true,
    roles: ['admin']
  },
  {
    id: 'admin-2',
    store_id: 'store-1',
    name: '伊藤副店長',
    email: 'ito@example.com',
    phone: '090-5678-9012',
    rank: '副店長',
    hourly_wage_yen: 0,
    active: true,
    roles: ['admin']
  },
  // 六本木プレミアム - スタッフ
  {
    id: 'staff-5',
    store_id: 'store-2',
    name: '渡辺優香',
    email: 'watanabe@example.com',
    phone: '090-6789-0123',
    rank: 'キャスト',
    hourly_wage_yen: 3500,
    active: true,
    roles: ['cast']
  },
  {
    id: 'staff-6',
    store_id: 'store-2',
    name: '中村彩乃',
    email: 'nakamura@example.com',
    phone: '090-7890-1234',
    rank: 'ホール',
    hourly_wage_yen: 2000,
    active: true,
    roles: ['cast']
  },
  // 六本木プレミアム - 管理者
  {
    id: 'admin-3',
    store_id: 'store-2',
    name: '小林店長',
    email: 'kobayashi@example.com',
    phone: '090-8901-2345',
    rank: '店長',
    hourly_wage_yen: 0,
    active: true,
    roles: ['admin']
  },
  // システム管理者
  {
    id: 'superadmin-1',
    store_id: 'store-1', // 主店舗
    name: 'システム管理者',
    email: 'system@example.com',
    phone: '090-0000-0000',
    rank: 'システム管理者',
    hourly_wage_yen: 0,
    active: true,
    roles: ['superadmin']
  },
  {
    id: 'superadmin-2',
    store_id: 'store-1',
    name: '技術責任者',
    email: 'tech@example.com',
    phone: '090-1111-1111',
    rank: '技術責任者',
    hourly_wage_yen: 0,
    active: true,
    roles: ['superadmin']
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'customer-1',
    store_id: 'store-1',
    display_name: '田中様',
    email: 'customer1@example.com',
    note: 'VIP顧客、シャンパン好み',
    blacklist: false,
    main_nomination_cast_id: 'staff-1', // 田中美咲を本指名
    main_nomination_cast_name: '田中美咲',
    nomination_history: [
      {
        id: 'nom-hist-1',
        customer_id: 'customer-1',
        cast_id: 'staff-1',
        cast_name: '田中美咲',
        nomination_type: 'main',
        started_at: '2024-12-01T00:00:00Z',
        notes: '本指名開始'
      }
    ],
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'customer-2',
    store_id: 'store-1',
    display_name: '佐藤様',
    email: 'customer2@example.com',
    note: 'ウイスキー愛好家',
    blacklist: false,
    main_nomination_cast_id: 'staff-2', // 佐藤花音を本指名
    main_nomination_cast_name: '佐藤花音',
    nomination_history: [
      {
        id: 'nom-hist-2',
        customer_id: 'customer-2',
        cast_id: 'staff-2',
        cast_name: '佐藤花音',
        nomination_type: 'main',
        started_at: '2024-11-15T00:00:00Z',
        notes: '本指名開始'
      }
    ],
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'customer-3',
    store_id: 'store-1',
    display_name: '鈴木様',
    email: 'customer3@example.com',
    note: '常連顧客、指名多数',
    blacklist: false,
    main_nomination_cast_id: 'staff-3', // 鈴木愛美を本指名
    main_nomination_cast_name: '鈴木愛美',
    nomination_history: [
      {
        id: 'nom-hist-3',
        customer_id: 'customer-3',
        cast_id: 'staff-3',
        cast_name: '鈴木愛美',
        nomination_type: 'main',
        started_at: '2024-10-01T00:00:00Z',
        notes: '本指名開始'
      }
    ],
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'customer-4',
    store_id: 'store-1',
    display_name: '高橋様',
    email: 'customer4@example.com',
    note: 'ボトル多数保有',
    blacklist: false,
    // 本指名なし（フリー顧客）
    nomination_history: [],
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'customer-5',
    store_id: 'store-2',
    display_name: '山田様',
    email: 'customer5@example.com',
    note: '六本木店VIP',
    blacklist: false,
    main_nomination_cast_id: 'staff-6', // 六本木店のキャストを本指名
    main_nomination_cast_name: '六本木美咲',
    nomination_history: [
      {
        id: 'nom-hist-4',
        customer_id: 'customer-5',
        cast_id: 'staff-6',
        cast_name: '六本木美咲',
        nomination_type: 'main',
        started_at: '2024-12-15T00:00:00Z',
        notes: '本指名開始'
      }
    ],
    created_at: '2025-01-01T00:00:00Z'
  }
];

export const mockTables: TableSeat[] = [
  // メインフロア - テーブル席 (1-15)
  { 
    id: 'table-1', store_id: 'store-1', label: 'テーブル1', capacity: 4, active: true, status: 'occupied',
    area: 'メインフロア', session_start: '2025-01-20T20:00:00Z', customer_name: '田中様', 
    staff_assigned: '田中美咲', last_updated: '2025-01-20T20:00:00Z', estimated_checkout: '2025-01-21T02:00:00Z'
  },
  { 
    id: 'table-2', store_id: 'store-1', label: 'テーブル2', capacity: 6, active: true, status: 'available',
    area: 'メインフロア', last_updated: '2025-01-20T23:30:00Z'
  },
  { 
    id: 'table-3', store_id: 'store-1', label: 'テーブル3', capacity: 4, active: true, status: 'reserved',
    area: 'メインフロア', customer_name: '鈴木様', estimated_checkout: '2025-01-21T01:00:00Z',
    last_updated: '2025-01-20T19:00:00Z', note: '誕生日パーティー予約'
  },
  { 
    id: 'table-4', store_id: 'store-1', label: 'テーブル4', capacity: 4, active: true, status: 'occupied',
    area: 'メインフロア', session_start: '2025-01-20T21:15:00Z', customer_name: '山田様',
    staff_assigned: '佐藤花音', last_updated: '2025-01-20T21:15:00Z'
  },
  { 
    id: 'table-5', store_id: 'store-1', label: 'テーブル5', capacity: 6, active: true, status: 'available',
    area: 'メインフロア', last_updated: '2025-01-20T22:45:00Z'
  },
  { 
    id: 'table-6', store_id: 'store-1', label: 'テーブル6', capacity: 4, active: true, status: 'cleaning',
    area: 'メインフロア', last_updated: '2025-01-20T23:15:00Z', note: '清掃中 - 約15分'
  },
  { 
    id: 'table-7', store_id: 'store-1', label: 'テーブル7', capacity: 8, active: true, status: 'occupied',
    area: 'メインフロア', session_start: '2025-01-20T19:30:00Z', customer_name: '大企業接待',
    staff_assigned: '鈴木愛美', last_updated: '2025-01-20T19:30:00Z', estimated_checkout: '2025-01-21T03:00:00Z'
  },
  { 
    id: 'table-8', store_id: 'store-1', label: 'テーブル8', capacity: 4, active: true, status: 'available',
    area: 'メインフロア', last_updated: '2025-01-20T23:00:00Z'
  },
  { 
    id: 'table-9', store_id: 'store-1', label: 'テーブル9', capacity: 6, active: true, status: 'reserved',
    area: 'メインフロア', customer_name: '高橋様', estimated_checkout: '2025-01-21T00:30:00Z',
    last_updated: '2025-01-20T18:00:00Z'
  },
  { 
    id: 'table-10', store_id: 'store-1', label: 'テーブル10', capacity: 4, active: true, status: 'occupied',
    area: 'メインフロア', session_start: '2025-01-20T22:00:00Z', customer_name: '佐藤様',
    staff_assigned: '田中美咲', last_updated: '2025-01-20T22:00:00Z'
  },
  { 
    id: 'table-11', store_id: 'store-1', label: 'テーブル11', capacity: 6, active: true, status: 'available',
    area: 'メインフロア', last_updated: '2025-01-20T21:30:00Z'
  },
  { 
    id: 'table-12', store_id: 'store-1', label: 'テーブル12', capacity: 4, active: true, status: 'available',
    area: 'メインフロア', last_updated: '2025-01-20T20:15:00Z'
  },
  { 
    id: 'table-13', store_id: 'store-1', label: 'テーブル13', capacity: 8, active: true, status: 'occupied',
    area: 'メインフロア', session_start: '2025-01-20T20:45:00Z', customer_name: '会社歓送迎会',
    staff_assigned: '佐藤花音', last_updated: '2025-01-20T20:45:00Z', estimated_checkout: '2025-01-21T02:30:00Z'
  },
  { 
    id: 'table-14', store_id: 'store-1', label: 'テーブル14', capacity: 4, active: true, status: 'cleaning',
    area: 'メインフロア', last_updated: '2025-01-20T23:45:00Z', note: '深清掃実施中'
  },
  { 
    id: 'table-15', store_id: 'store-1', label: 'テーブル15', capacity: 6, active: true, status: 'available',
    area: 'メインフロア', last_updated: '2025-01-20T22:30:00Z'
  },

  // カウンター席 (C1-C8)
  { 
    id: 'counter-1', store_id: 'store-1', label: 'カウンター1', capacity: 1, active: true, status: 'occupied',
    area: 'カウンター', session_start: '2025-01-20T21:30:00Z', customer_name: '常連A様',
    last_updated: '2025-01-20T21:30:00Z'
  },
  { 
    id: 'counter-2', store_id: 'store-1', label: 'カウンター2', capacity: 1, active: true, status: 'available',
    area: 'カウンター', last_updated: '2025-01-20T23:15:00Z'
  },
  { 
    id: 'counter-3', store_id: 'store-1', label: 'カウンター3', capacity: 1, active: true, status: 'occupied',
    area: 'カウンター', session_start: '2025-01-20T22:15:00Z', customer_name: '常連B様',
    last_updated: '2025-01-20T22:15:00Z'
  },
  { 
    id: 'counter-4', store_id: 'store-1', label: 'カウンター4', capacity: 1, active: true, status: 'available',
    area: 'カウンター', last_updated: '2025-01-20T21:45:00Z'
  },
  { 
    id: 'counter-5', store_id: 'store-1', label: 'カウンター5', capacity: 1, active: true, status: 'available',
    area: 'カウンター', last_updated: '2025-01-20T23:00:00Z'
  },
  { 
    id: 'counter-6', store_id: 'store-1', label: 'カウンター6', capacity: 1, active: true, status: 'occupied',
    area: 'カウンター', session_start: '2025-01-20T20:30:00Z', customer_name: '一見様',
    last_updated: '2025-01-20T20:30:00Z'
  },
  { 
    id: 'counter-7', store_id: 'store-1', label: 'カウンター7', capacity: 1, active: true, status: 'cleaning',
    area: 'カウンター', last_updated: '2025-01-20T23:30:00Z'
  },
  { 
    id: 'counter-8', store_id: 'store-1', label: 'カウンター8', capacity: 1, active: true, status: 'available',
    area: 'カウンター', last_updated: '2025-01-20T22:00:00Z'
  },

  // VIPルーム (VIP1-VIP4)
  { 
    id: 'vip-1', store_id: 'store-1', label: 'VIPルーム1', capacity: 10, active: true, status: 'occupied',
    area: 'VIP', session_start: '2025-01-20T19:00:00Z', customer_name: 'VIP田中様グループ',
    staff_assigned: '鈴木愛美', last_updated: '2025-01-20T19:00:00Z', estimated_checkout: '2025-01-21T04:00:00Z',
    note: 'シャンパンタワー予定'
  },
  { 
    id: 'vip-2', store_id: 'store-1', label: 'VIPルーム2', capacity: 12, active: true, status: 'reserved',
    area: 'VIP', customer_name: '企業重役会', estimated_checkout: '2025-01-21T02:00:00Z',
    last_updated: '2025-01-20T17:00:00Z', staff_assigned: '田中美咲', note: '重要顧客 - 最高級サービス'
  },
  { 
    id: 'vip-3', store_id: 'store-1', label: 'VIPルーム3', capacity: 8, active: true, status: 'available',
    area: 'VIP', last_updated: '2025-01-20T22:15:00Z'
  },
  { 
    id: 'vip-4', store_id: 'store-1', label: 'VIPルーム4', capacity: 15, active: true, status: 'occupied',
    area: 'VIP', session_start: '2025-01-20T20:30:00Z', customer_name: '大口顧客パーティー',
    staff_assigned: '佐藤花音', last_updated: '2025-01-20T20:30:00Z', estimated_checkout: '2025-01-21T05:00:00Z',
    note: 'ボトルキープ多数'
  },

  // 個室 (P1-P3)
  { 
    id: 'private-1', store_id: 'store-1', label: '個室1', capacity: 6, active: true, status: 'reserved',
    area: '個室', customer_name: 'プライベート会合', estimated_checkout: '2025-01-21T01:30:00Z',
    last_updated: '2025-01-20T18:30:00Z', staff_assigned: '鈴木愛美'
  },
  { 
    id: 'private-2', store_id: 'store-1', label: '個室2', capacity: 4, active: true, status: 'available',
    area: '個室', last_updated: '2025-01-20T23:00:00Z'
  },
  { 
    id: 'private-3', store_id: 'store-1', label: '個室3', capacity: 8, active: true, status: 'occupied',
    area: '個室', session_start: '2025-01-20T21:00:00Z', customer_name: '接待会議',
    staff_assigned: '田中美咲', last_updated: '2025-01-20T21:00:00Z', estimated_checkout: '2025-01-21T03:00:00Z',
    note: '商談中 - 静かに'
  },

  // 六本木プレミアム店舗のテーブル
  { 
    id: 'rop-premium-1', store_id: 'store-2', label: 'プレミアム1', capacity: 6, active: true, status: 'occupied',
    area: 'プレミアム', session_start: '2025-01-20T20:00:00Z', customer_name: '六本木VIP様',
    last_updated: '2025-01-20T20:00:00Z'
  },
  { 
    id: 'rop-premium-2', store_id: 'store-2', label: 'プレミアム2', capacity: 8, active: true, status: 'available',
    area: 'プレミアム', last_updated: '2025-01-20T22:30:00Z'
  },
  { 
    id: 'rop-vip-suite', store_id: 'store-2', label: 'VIPスイート', capacity: 12, active: true, status: 'reserved',
    area: 'VIPスイート', customer_name: '特別顧客', estimated_checkout: '2025-01-21T03:00:00Z',
    last_updated: '2025-01-20T16:00:00Z', note: '最高級コース予約'
  }
];

export const mockCategories: MenuCategory[] = [
  {
    id: 'cat-1',
    store_id: 'store-1',
    name: 'ボトル',
    service_charge_applicable: true,
    tax_applicable: true,
    bottle_back_applicable: true,
    sort_order: 1
  },
  {
    id: 'cat-2',
    store_id: 'store-1',
    name: 'ドリンク',
    service_charge_applicable: true,
    tax_applicable: true,
    bottle_back_applicable: false,
    sort_order: 2
  },
  {
    id: 'cat-3',
    store_id: 'store-1',
    name: 'フード',
    service_charge_applicable: true,
    tax_applicable: true,
    bottle_back_applicable: false,
    sort_order: 3
  },
  {
    id: 'cat-4',
    store_id: 'store-1',
    name: 'セット',
    service_charge_applicable: true,
    tax_applicable: true,
    bottle_back_applicable: false,
    sort_order: 4
  }
];

export const mockMenuItems: MenuItem[] = [
  // ボトル
  {
    id: 'item-1',
    store_id: 'store-1',
    category_id: 'cat-1',
    name: 'ドンペリニヨン ヴィンテージ',
    sku: 'DOM001',
    is_bottle: true,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 180000,
    image_url: 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  },
  {
    id: 'item-2',
    store_id: 'store-1',
    category_id: 'cat-1',
    name: 'ヘネシー XO',
    sku: 'HEN001',
    is_bottle: true,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 120000,
    image_url: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  },
  {
    id: 'item-3',
    store_id: 'store-1',
    category_id: 'cat-1',
    name: 'マッカラン 18年',
    sku: 'MAC001',
    is_bottle: true,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 150000,
    image_url: 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  },
  // ドリンク
  {
    id: 'item-4',
    store_id: 'store-1',
    category_id: 'cat-2',
    name: 'シャンパン グラス',
    sku: 'CHA001',
    is_bottle: false,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 3500,
    image_url: 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  },
  {
    id: 'item-5',
    store_id: 'store-1',
    category_id: 'cat-2',
    name: 'ウイスキー ロック',
    sku: 'WHI001',
    is_bottle: false,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 2800,
    image_url: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  },
  {
    id: 'item-6',
    store_id: 'store-1',
    category_id: 'cat-2',
    name: 'カクテル各種',
    sku: 'COC001',
    is_bottle: false,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 2200,
    image_url: 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  },
  // フード
  {
    id: 'item-7',
    store_id: 'store-1',
    category_id: 'cat-3',
    name: 'フルーツ盛り合わせ',
    sku: 'FRU001',
    is_bottle: false,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 4500,
    image_url: 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  },
  {
    id: 'item-8',
    store_id: 'store-1',
    category_id: 'cat-3',
    name: 'チーズプラッター',
    sku: 'CHE001',
    is_bottle: false,
    is_active: true,
    tax_category: 'standard',
    current_price_yen: 3800,
    image_url: 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  }
];

export const mockSessions: ServiceSession[] = [
  {
    id: 'session-1',
    store_id: 'store-1',
    table_seat_id: 'table-1',
    customer_id: 'customer-1',
    opened_at: '2025-01-20T20:00:00Z',
    business_date: '2025-01-20',
    status: 'open',
    participating_casts: [
      {
        staff_id: 'staff-1',
        joined_at: '2025-01-20T20:00:00Z',
        is_primary: true
      }
    ]
  },
  {
    id: 'session-2',
    store_id: 'store-1',
    table_seat_id: 'table-4',
    customer_id: 'customer-2',
    opened_at: '2025-01-20T21:30:00Z',
    business_date: '2025-01-20',
    status: 'open',
    participating_casts: [
      {
        staff_id: 'staff-2',
        joined_at: '2025-01-20T21:30:00Z',
        is_primary: true
      },
      {
        staff_id: 'staff-1',
        joined_at: '2025-01-20T22:00:00Z',
        is_primary: false
      }
    ]
  }
];

export const mockOrders: Order[] = [
  {
    id: 'order-1',
    store_id: 'store-1',
    session_id: 'session-1',
    table_seat_id: 'table-1',
    customer_id: 'customer-1',
    subtotal_yen: 183500,
    service_charge_yen: 27525,
    tax_yen: 21102,
    discount_yen: 0,
    total_yen: 232127,
    service_charge_bp: 1500,
    tax_bp: 1000,
    status: 'confirmed',
    created_at: '2025-01-20T20:15:00Z',
    confirmed_at: '2025-01-20T20:20:00Z',
    items: [
      {
        id: 'orderitem-1',
        order_id: 'order-1',
        menu_item_id: 'item-1',
        qty: 1,
        unit_price_yen: 180000,
        line_subtotal_yen: 180000,
        canceled: false,
        cast_id: 'staff-1',
        menu_item: mockMenuItems[0]
      },
      {
        id: 'orderitem-2',
        order_id: 'order-1',
        menu_item_id: 'item-4',
        qty: 1,
        unit_price_yen: 3500,
        line_subtotal_yen: 3500,
        canceled: false,
        cast_id: 'staff-1',
        menu_item: mockMenuItems[3]
      }
    ]
  }
];

export const mockAttendance: Attendance[] = [
  {
    id: 'att-1',
    store_id: 'store-1',
    staff_id: 'staff-1',
    clock_in: '2025-01-20T19:00:00Z',
    break_minutes: 30,
    note: '',
    status: 'pending'
  },
  {
    id: 'att-2',
    store_id: 'store-1',
    staff_id: 'staff-2',
    clock_in: '2025-01-20T19:30:00Z',
    break_minutes: 15,
    note: '',
    status: 'pending'
  }
];

// ボトル管理のモックデータ（店舗在庫管理）
export const mockBottles: Bottle[] = [
  {
    id: 'bottle-1',
    store_id: 'store-1',
    menu_item_id: 'item-1',
    name: 'ドンペリニヨン ヴィンテージ',
    remaining_ml: 0,
    total_ml: 750,
    expires_at: '2025-12-31',
    status: 'empty',
    created_at: '2025-01-15T00:00:00Z'
  },
  {
    id: 'bottle-2',
    store_id: 'store-1',
    menu_item_id: 'item-2',
    name: 'ヘネシー XO',
    remaining_ml: 0,
    total_ml: 700,
    expires_at: '2025-06-30',
    status: 'empty',
    created_at: '2025-01-10T00:00:00Z'
  },
  {
    id: 'bottle-3',
    store_id: 'store-1',
    menu_item_id: 'item-3',
    name: 'マッカラン 18年',
    remaining_ml: 0,
    total_ml: 700,
    expires_at: '2025-08-15',
    status: 'empty',
    created_at: '2025-01-18T00:00:00Z'
  },
  {
    id: 'bottle-4',
    store_id: 'store-1',
    menu_item_id: 'item-1',
    name: 'ドンペリニヨン ヴィンテージ',
    remaining_ml: 750,
    total_ml: 750,
    expires_at: '2025-12-31',
    status: 'active',
    created_at: '2025-01-20T00:00:00Z'
  },
  {
    id: 'bottle-5',
    store_id: 'store-1',
    menu_item_id: 'item-2',
    name: 'ヘネシー XO',
    remaining_ml: 700,
    total_ml: 700,
    expires_at: '2025-06-30',
    status: 'active',
    created_at: '2025-01-20T00:00:00Z'
  },
  {
    id: 'bottle-6',
    store_id: 'store-1',
    menu_item_id: 'item-3',
    name: 'マッカラン 18年',
    remaining_ml: 500,
    total_ml: 700,
    expires_at: '2025-08-15',
    status: 'active',
    created_at: '2025-01-20T00:00:00Z'
  },
  {
    id: 'bottle-7',
    store_id: 'store-1',
    menu_item_id: 'item-1',
    name: 'ドンペリニヨン ヴィンテージ',
    remaining_ml: 150,
    total_ml: 750,
    expires_at: '2025-12-31',
    status: 'active',
    created_at: '2025-01-15T00:00:00Z'
  },
  {
    id: 'bottle-8',
    store_id: 'store-1',
    menu_item_id: 'item-2',
    name: 'ヘネシー XO',
    remaining_ml: 0,
    total_ml: 700,
    expires_at: '2025-03-31',
    status: 'expired',
    created_at: '2025-01-01T00:00:00Z'
  }
];

// 予約のモックデータ
export const mockReservations: Reservation[] = [
  {
    id: 'reservation-1',
    store_id: 'store-1',
    customer_id: 'customer-3',
    table_seat_id: 'table-3',
    start_at: '2025-01-21T20:00:00Z',
    end_at: '2025-01-21T23:00:00Z',
    party_size: 4,
    note: '誕生日パーティー',
    status: 'booked',
    created_at: '2025-01-18T00:00:00Z'
  }
];

// シフトのモックデータ
export const mockShifts: Shift[] = [
  {
    id: 'shift-1',
    store_id: 'store-1',
    staff_id: 'staff-1',
    date: '2025-01-21',
    start_time: '19:00',
    end_time: '02:00',
    break_minutes: 30,
    status: 'published',
    note: ''
  },
  {
    id: 'shift-2',
    store_id: 'store-1',
    staff_id: 'staff-2',
    date: '2025-01-21',
    start_time: '20:00',
    end_time: '03:00',
    break_minutes: 30,
    status: 'published',
    note: ''
  }
];

// 給与のモックデータ
export const mockPayrollRuns: PayrollRun[] = [
  {
    id: 'payroll-1',
    store_id: 'store-1',
    period_start: '2025-01-01',
    period_end: '2025-01-31',
    status: 'draft',
    total_amount_yen: 1250000,
    created_at: '2025-01-25T00:00:00Z'
  }
];

export const mockPayrollItems: PayrollItem[] = [
  {
    id: 'payroll-item-1',
    payroll_run_id: 'payroll-1',
    staff_id: 'staff-1',
    base_hours: 120,
    base_wage_yen: 300000,
    nomination_count: 15,
    nomination_amount_yen: 75000,
    bottle_sales_yen: 500000,
    bottle_back_yen: 50000,
    overtime_hours: 5,
    overtime_wage_yen: 15000,
    deduction_yen: 5000,
    total_yen: 435000,
    staff: mockStaff[0]
  },
  {
    id: 'payroll-item-2',
    payroll_run_id: 'payroll-1',
    staff_id: 'staff-2',
    base_hours: 100,
    base_wage_yen: 180000,
    nomination_count: 8,
    nomination_amount_yen: 24000,
    bottle_sales_yen: 0,
    bottle_back_yen: 0,
    overtime_hours: 2,
    overtime_wage_yen: 5000,
    deduction_yen: 2000,
    total_yen: 207000,
    staff: mockStaff[1]
  }
];

// レジ締めのモックデータ
export const mockRegisterCloses: RegisterClose[] = [
  {
    id: 'close-1',
    store_id: 'store-1',
    business_date: '2025-01-19',
    cash_expected_yen: 450000,
    cash_actual_yen: 448500,
    difference_yen: -1500,
    note: '小銭不足',
    closed_by_staff_id: 'admin-1',
    closed_at: '2025-01-20T05:30:00Z'
  }
];

// 監査ログのモックデータ
export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    store_id: 'store-1',
    actor_staff_id: 'staff-1',
    entity: 'order',
    entity_id: 'order-1',
    action: 'create',
    diff: { status: 'draft', total_yen: 232127 },
    created_at: '2025-01-20T20:15:00Z'
  },
  {
    id: 'audit-2',
    store_id: 'store-1',
    actor_staff_id: 'admin-1',
    entity: 'menu_item',
    entity_id: 'item-1',
    action: 'update',
    diff: { old_price: 175000, new_price: 180000 },
    created_at: '2025-01-20T10:00:00Z'
  }
];
// 売上データ（日次）
export const mockDailySales = {
  '2025-01-20': {
    subtotal_yen: 850000,
    service_charge_yen: 127500,
    tax_yen: 97750,
    discount_yen: 15000,
    total_yen: 1060250,
    order_count: 12,
    customer_count: 8
  },
  '2025-01-19': {
    subtotal_yen: 720000,
    service_charge_yen: 108000,
    tax_yen: 82800,
    discount_yen: 8000,
    total_yen: 902800,
    order_count: 10,
    customer_count: 6
  }
};

// 月次売上データ
export const mockMonthlySales = {
  '2025-01': {
    subtotal_yen: 15800000,
    service_charge_yen: 2370000,
    tax_yen: 1817000,
    discount_yen: 158000,
    total_yen: 19829000,
    order_count: 245,
    customer_count: 180,
    avg_customer_spend: 110161
  }
};

// キャスト別売上データ
export const mockStaffSales = [
  {
    staff_id: 'staff-1',
    staff_name: '田中美咲',
    nomination_count: 15,
    bottle_sales_yen: 500000,
    total_sales_yen: 850000,
    commission_yen: 50000
  },
  {
    staff_id: 'staff-3',
    staff_name: '鈴木愛美',
    nomination_count: 12,
    bottle_sales_yen: 420000,
    total_sales_yen: 680000,
    commission_yen: 42000
  }
];
// API統合準備用のヘルパー関数
export const apiEndpoints = {
  // 認証
  login: '/api/v1/auth/login',
  logout: '/api/v1/auth/logout',
  
  // 店舗・スタッフ
  stores: '/api/v1/stores',
  staff: '/api/v1/staff',
  
  // テーブル・セッション
  tables: '/api/v1/tables',
  sessions: '/api/v1/sessions',
  
  // メニュー・注文
  menu: '/api/v1/menu',
  orders: '/api/v1/orders',
  checkout: '/api/v1/checkout',
  
  // 決済・レシート
  payments: '/api/v1/payments',
  receipts: '/api/v1/receipts',
  
  // 勤怠・給与
  attendance: '/api/v1/attendance',
  payroll: '/api/v1/payroll',
  
  // 売上・レポート
  sales: '/api/v1/sales',
  reports: '/api/v1/reports',
  
  // 管理
  customers: '/api/v1/customers',
  inventory: '/api/v1/inventory',
  settings: '/api/v1/settings',
  
  // ボトル・予約
  bottles: '/api/v1/bottles',
  reservations: '/api/v1/reservations',
  
  // シフト・レジ締め
  shifts: '/api/v1/shifts',
  register: '/api/v1/register',
  
  // 監査
  audit: '/api/v1/audit'
};

// 通貨フォーマット
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '¥0';
  }
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0
  }).format(amount);
};

// 日時フォーマット
export const formatDateTime = (dateString: string): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  }).format(new Date(dateString));
};

// 日付フォーマット
export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo'
  }).format(new Date(dateString));
};

// 時刻フォーマット
export const formatTime = (dateString: string): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  }).format(new Date(dateString));
};
// 営業時間計算
export const calculateWorkingHours = (clockIn: string, clockOut?: string, breakMinutes: number = 0): number => {
  const start = new Date(clockIn);
  const end = clockOut ? new Date(clockOut) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, diffHours - (breakMinutes / 60));
};
// パーセンテージフォーマット
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// 数値フォーマット
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ja-JP').format(value);
};

// ボトル残量パーセンテージ
export const getBottlePercentage = (remaining: number, total: number): number => {
  return Math.round((remaining / total) * 100);
};

// ステータス表示用の日本語変換
export const getStatusText = (status: string, type: string): string => {
  const statusMap: Record<string, Record<string, string>> = {
    table: {
      available: '空席',
      occupied: '使用中',
      reserved: '予約済',
      cleaning: '清掃中'
    },
    order: {
      draft: '下書き',
      confirmed: '確定',
      void: '取消'
    },
    session: {
      open: '接客中',
      settled: '会計済',
      void: '取消'
    },
    attendance: {
      pending: '承認待ち',
      locked: 'ロック済',
      approved: '承認済'
    },
    payroll: {
      draft: '下書き',
      confirmed: '確定',
      paid: '支払済'
    },
    reservation: {
      booked: '予約済',
      arrived: '来店済',
      cancelled: 'キャンセル',
      no_show: '無断キャンセル'
    },
    bottle: {
      active: '使用中',
      empty: '空',
      expired: '期限切れ'
    }
  };
  
  return statusMap[type]?.[status] || status;
};