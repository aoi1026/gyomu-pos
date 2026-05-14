// テーブル認証システム
export interface TableAuth {
  table_id: string;
  table_label: string;
  area: string;
  capacity: number | null;
  status: 'available' | 'occupied';
  login_time: string;
  session_id?: string;
  assigned_cast_id?: string;
  assigned_cast_name?: string;
}

export interface TableLoginCredentials {
  table_id: string;
}

// ローカルストレージからテーブル認証情報を取得
export const getCurrentTable = (): TableAuth | null => {
  if (typeof window === 'undefined') return null;
   
  try {
    const stored = localStorage.getItem('table_auth');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get table auth:', error);
    return null;
  }
};

// テーブルとしてログイン
export const loginAsTable = async (credentials: TableLoginCredentials): Promise<TableAuth> => {
  try {
    // データベースからテーブル情報を取得
    const response = await fetch('/api/tables');
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('テーブル情報の取得に失敗しました');
    }
    
    // 指定されたテーブルIDの情報を検索
    const tableInfo = result.tables.find((table: any) => table.id.toString() === credentials.table_id);
    
    if (!tableInfo) {
      throw new Error('指定されたテーブルが見つかりません');
    }
    
    const tableAuth: TableAuth = {
      table_id: credentials.table_id,
      table_label: tableInfo.name,
      area: tableInfo.area || 'メインフロア',
      capacity: tableInfo.capacity,
      status: 'available',
      login_time: new Date().toISOString()
    };

    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('table_auth', JSON.stringify(tableAuth));
    }

    return tableAuth;
  } catch (error) {
    console.error('テーブルログインエラー:', error);
    throw error;
  }
};

// テーブルログアウト
export const logoutTable = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('table_auth');
  }
};

// テーブルセッション開始
export const startTableSession = async (tableId: string): Promise<TableAuth> => {
  const currentTable = getCurrentTable();
  if (!currentTable || String(currentTable.table_id) !== String(tableId)) {
    throw new Error('テーブル認証情報が見つかりません');
  }

  const updatedTable: TableAuth = {
    ...currentTable,
    status: 'occupied',
    session_id: `session-${Date.now()}`
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('table_auth', JSON.stringify(updatedTable));
  }

  return updatedTable;
};

// テーブルセッション終了
export const endTableSession = async (tableId: string): Promise<TableAuth> => {
  const currentTable = getCurrentTable();
  if (!currentTable || String(currentTable.table_id) !== String(tableId)) {
    throw new Error('テーブル認証情報が見つかりません');
  }

  const updatedTable: TableAuth = {
    ...currentTable,
    status: 'available',
    session_id: undefined
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('table_auth', JSON.stringify(updatedTable));
  }

  return updatedTable;
};