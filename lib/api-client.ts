// API クライアント - 将来のバックエンド統合準備
import { 
  mockStore, mockStaff, mockCustomers, mockTables, mockCategories, 
  mockMenuItems, mockSessions, mockOrders, mockAttendance, mockDailySales,
  Store, Staff, Customer, TableSeat, MenuCategory, MenuItem, 
  ServiceSession, Order, Attendance, apiEndpoints
} from './mock-data';

// API レスポンス型
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// エラーハンドリング
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// HTTP クライアント（将来はaxiosやfetch APIに置き換え）
class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // モック環境では実際のHTTPリクエストを送信せず、モックデータを返す
    if (process.env.NODE_ENV === 'development' || !this.baseUrl) {
      return this.mockRequest<T>(endpoint, options);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('ネットワークエラーが発生しました', 0);
    }
  }

  // モックリクエスト処理
  private async mockRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // API遅延をシミュレート
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

    const method = options.method || 'GET';
    
    // モックデータのルーティング
    if (endpoint === apiEndpoints.stores && method === 'GET') {
      return { data: mockStore as T, success: true };
    }
    
    if (endpoint === apiEndpoints.staff && method === 'GET') {
      return { data: mockStaff as T, success: true };
    }
    
    if (endpoint === apiEndpoints.tables && method === 'GET') {
      return { data: mockTables as T, success: true };
    }
    
    if (endpoint === apiEndpoints.menu && method === 'GET') {
      return { 
        data: { 
          categories: mockCategories, 
          items: mockMenuItems 
        } as T, 
        success: true 
      };
    }
    
    if (endpoint === apiEndpoints.sessions && method === 'GET') {
      return { data: mockSessions as T, success: true };
    }
    
    if (endpoint === apiEndpoints.orders && method === 'GET') {
      return { data: mockOrders as T, success: true };
    }
    
    if (endpoint === apiEndpoints.attendance && method === 'GET') {
      return { data: mockAttendance as T, success: true };
    }
    
    if (endpoint.startsWith('/api/v1/sales/daily')) {
      return { data: mockDailySales as T, success: true };
    }

    // POST/PUT/DELETE のモック処理
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const body = options.body ? JSON.parse(options.body as string) : {};
      
      // 新規作成の場合はIDを生成して返す
      const mockResponse = {
        id: `mock-${Date.now()}`,
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return { data: mockResponse as T, success: true };
    }

    // デフォルトレスポンス
    return { data: {} as T, success: true };
  }

  // 公開メソッド
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// 具体的なAPI関数
export const storeApi = {
  getStore: () => apiClient.get<Store>(apiEndpoints.stores),
  updateStore: (data: Partial<Store>) => apiClient.put<Store>(apiEndpoints.stores, data),
};

export const staffApi = {
  getStaff: () => apiClient.get<Staff[]>(apiEndpoints.staff),
  createStaff: (data: Omit<Staff, 'id'>) => apiClient.post<Staff>(apiEndpoints.staff, data),
  updateStaff: (id: string, data: Partial<Staff>) => 
    apiClient.put<Staff>(`${apiEndpoints.staff}/${id}`, data),
};

export const tableApi = {
  getTables: () => apiClient.get<TableSeat[]>(apiEndpoints.tables),
  updateTableStatus: (id: string, status: TableSeat['status']) =>
    apiClient.patch<TableSeat>(`${apiEndpoints.tables}/${id}`, { status }),
};

export const menuApi = {
  getMenu: () => apiClient.get<{ categories: MenuCategory[], items: MenuItem[] }>(apiEndpoints.menu),
  createMenuItem: (data: Omit<MenuItem, 'id'>) => 
    apiClient.post<MenuItem>(`${apiEndpoints.menu}/items`, data),
  updateMenuItem: (id: string, data: Partial<MenuItem>) =>
    apiClient.put<MenuItem>(`${apiEndpoints.menu}/items/${id}`, data),
};

export const orderApi = {
  getOrders: (sessionId?: string) => {
    const endpoint = sessionId 
      ? `${apiEndpoints.orders}?session_id=${sessionId}`
      : apiEndpoints.orders;
    return apiClient.get<Order[]>(endpoint);
  },
  createOrder: (data: Omit<Order, 'id'>) => apiClient.post<Order>(apiEndpoints.orders, data),
  updateOrder: (id: string, data: Partial<Order>) =>
    apiClient.put<Order>(`${apiEndpoints.orders}/${id}`, data),
  confirmOrder: (id: string) =>
    apiClient.post<Order>(`${apiEndpoints.orders}/${id}/confirm`, {}),
};

export const paymentApi = {
  processPayment: (data: { order_id: string, method: string, amount_yen: number }) =>
    apiClient.post(`${apiEndpoints.payments}`, data),
  getReceipt: (orderId: string) =>
    apiClient.get(`${apiEndpoints.receipts}?order_id=${orderId}`),
};

export const attendanceApi = {
  getAttendance: (staffId?: string, date?: string) => {
    let endpoint = apiEndpoints.attendance;
    const params = new URLSearchParams();
    if (staffId) params.append('staff_id', staffId);
    if (date) params.append('date', date);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiClient.get<Attendance[]>(endpoint);
  },
  clockIn: (data: { staff_id: string, note?: string }) =>
    apiClient.post<Attendance>(`${apiEndpoints.attendance}/clock-in`, data),
  clockOut: (id: string, data: { break_minutes?: number, note?: string }) =>
    apiClient.post<Attendance>(`${apiEndpoints.attendance}/${id}/clock-out`, data),
};

export const salesApi = {
  getDailySales: (date?: string) => {
    const endpoint = date 
      ? `${apiEndpoints.sales}/daily?date=${date}`
      : `${apiEndpoints.sales}/daily`;
    return apiClient.get(endpoint);
  },
  getMonthlySales: (year: number, month: number) =>
    apiClient.get(`${apiEndpoints.sales}/monthly?year=${year}&month=${month}`),
};