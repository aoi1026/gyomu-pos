// 指名システム管理
export interface Nomination {
  id: string;
  table_id: string;
  cast_id: string;
  cast_name: string;
  nomination_type: 'nomination' | 'field_nomination'; // 本指名 or 場内指名
  amount_yen: number;
  back_rate: number;
  back_amount_yen: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  note?: string;
}

export interface NominationSummary {
  cast_id: string;
  cast_name: string;
  nomination_count: number;
  field_nomination_count: number;
  total_nomination_amount: number;
  total_field_nomination_amount: number;
  total_back_amount: number;
}

// モックデータ
export const mockNominations: Nomination[] = [
  {
    id: 'nom-1',
    table_id: 'table-1',
    cast_id: 'staff-1',
    cast_name: '田中美咲',
    nomination_type: 'nomination',
    amount_yen: 50000,
    back_rate: 0.15,
    back_amount_yen: 7500,
    status: 'confirmed',
    created_at: '2025-01-20T20:30:00Z',
    confirmed_at: '2025-01-20T20:35:00Z'
  },
  {
    id: 'nom-2',
    table_id: 'table-1',
    cast_id: 'staff-1',
    cast_name: '田中美咲',
    nomination_type: 'field_nomination',
    amount_yen: 20000,
    back_rate: 0.08,
    back_amount_yen: 1600,
    status: 'confirmed',
    created_at: '2025-01-20T21:00:00Z',
    confirmed_at: '2025-01-20T21:05:00Z'
  },
  {
    id: 'nom-3',
    table_id: 'table-2',
    cast_id: 'staff-2',
    cast_name: '佐藤花音',
    nomination_type: 'nomination',
    amount_yen: 30000,
    back_rate: 0.15,
    back_amount_yen: 4500,
    status: 'pending',
    created_at: '2025-01-20T21:15:00Z'
  }
];

// 指名を作成
export const createNomination = async (
  tableId: string,
  castId: string,
  castName: string,
  nominationType: 'nomination' | 'field_nomination',
  amountYen: number,
  note?: string
): Promise<Nomination> => {
  // バック率を取得
  const { getCurrentBackRate } = await import('./cast-back-system');
  const backRate = getCurrentBackRate(castId);
  
  if (!backRate) {
    throw new Error('キャストのバック率が見つかりません');
  }

  const backRateValue = nominationType === 'nomination' 
    ? backRate.nomination_rate 
    : backRate.field_nomination_rate;

  const newNomination: Nomination = {
    id: `nom-${Date.now()}`,
    table_id: tableId,
    cast_id: castId,
    cast_name: castName,
    nomination_type: nominationType,
    amount_yen: amountYen,
    back_rate: backRateValue,
    back_amount_yen: Math.round(amountYen * backRateValue),
    status: 'pending',
    created_at: new Date().toISOString(),
    note
  };

  // 実際のAPIでは保存処理
  console.log('Creating nomination:', newNomination);
  
  return newNomination;
};

// 指名を確認
export const confirmNomination = async (nominationId: string): Promise<Nomination> => {
  const nomination = mockNominations.find(n => n.id === nominationId);
  if (!nomination) {
    throw new Error('指名が見つかりません');
  }

  const updatedNomination: Nomination = {
    ...nomination,
    status: 'confirmed',
    confirmed_at: new Date().toISOString()
  };

  // 実際のAPIでは更新処理
  console.log('Confirming nomination:', updatedNomination);
  
  return updatedNomination;
};

// 指名をキャンセル
export const cancelNomination = async (nominationId: string, reason?: string): Promise<Nomination> => {
  const nomination = mockNominations.find(n => n.id === nominationId);
  if (!nomination) {
    throw new Error('指名が見つかりません');
  }

  const updatedNomination: Nomination = {
    ...nomination,
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    note: reason ? `${nomination.note || ''}\nキャンセル理由: ${reason}`.trim() : nomination.note
  };

  // 実際のAPIでは更新処理
  console.log('Cancelling nomination:', updatedNomination);
  
  return updatedNomination;
};

// テーブル別の指名一覧を取得
export const getTableNominations = (tableId: string): Nomination[] => {
  return mockNominations.filter(n => n.table_id === tableId);
};

// キャスト別の指名一覧を取得
export const getCastNominations = (castId: string, date?: string): Nomination[] => {
  let nominations = mockNominations.filter(n => n.cast_id === castId);
  
  if (date) {
    const targetDate = new Date(date).toISOString().split('T')[0];
    nominations = nominations.filter(n => 
      n.created_at.startsWith(targetDate)
    );
  }
  
  return nominations;
};

// キャスト別の指名サマリーを取得
export const getCastNominationSummary = (castId: string, date?: string): NominationSummary => {
  const nominations = getCastNominations(castId, date);
  const confirmedNominations = nominations.filter(n => n.status === 'confirmed');
  
  const nominationCount = confirmedNominations.filter(n => n.nomination_type === 'nomination').length;
  const fieldNominationCount = confirmedNominations.filter(n => n.nomination_type === 'field_nomination').length;
  
  const totalNominationAmount = confirmedNominations
    .filter(n => n.nomination_type === 'nomination')
    .reduce((sum, n) => sum + n.amount_yen, 0);
    
  const totalFieldNominationAmount = confirmedNominations
    .filter(n => n.nomination_type === 'field_nomination')
    .reduce((sum, n) => sum + n.amount_yen, 0);
    
  const totalBackAmount = confirmedNominations.reduce((sum, n) => sum + n.back_amount_yen, 0);
  
  const castName = nominations[0]?.cast_name || `Cast ${castId.slice(-4)}`;
  
  return {
    cast_id: castId,
    cast_name: castName,
    nomination_count: nominationCount,
    field_nomination_count: fieldNominationCount,
    total_nomination_amount: totalNominationAmount,
    total_field_nomination_amount: totalFieldNominationAmount,
    total_back_amount: totalBackAmount
  };
};

// 期間別の指名統計を取得
export const getNominationStats = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const periodNominations = mockNominations.filter(n => {
    const nominationDate = new Date(n.created_at);
    return nominationDate >= start && nominationDate <= end && n.status === 'confirmed';
  });
  
  const totalNominations = periodNominations.length;
  const totalAmount = periodNominations.reduce((sum, n) => sum + n.amount_yen, 0);
  const totalBackAmount = periodNominations.reduce((sum, n) => sum + n.back_amount_yen, 0);
  
  const castStats = periodNominations.reduce((acc, n) => {
    if (!acc[n.cast_id]) {
      acc[n.cast_id] = {
        cast_name: n.cast_name,
        nomination_count: 0,
        field_nomination_count: 0,
        total_amount: 0,
        total_back_amount: 0
      };
    }
    
    if (n.nomination_type === 'nomination') {
      acc[n.cast_id].nomination_count++;
    } else {
      acc[n.cast_id].field_nomination_count++;
    }
    
    acc[n.cast_id].total_amount += n.amount_yen;
    acc[n.cast_id].total_back_amount += n.back_amount_yen;
    
    return acc;
  }, {} as Record<string, any>);
  
  return {
    period: { start: startDate, end: endDate },
    total_nominations: totalNominations,
    total_amount: totalAmount,
    total_back_amount: totalBackAmount,
    cast_stats: Object.values(castStats)
  };
};

// 指名タイプの表示名を取得
export const getNominationTypeLabel = (type: 'nomination' | 'field_nomination'): string => {
  return type === 'nomination' ? '本指名' : '場内指名';
};

// 指名ステータスの表示名を取得
export const getNominationStatusLabel = (status: 'pending' | 'confirmed' | 'cancelled'): string => {
  const statusMap = {
    pending: '確認待ち',
    confirmed: '確定',
    cancelled: 'キャンセル'
  };
  return statusMap[status];
};

// 指名ステータスの色を取得
export const getNominationStatusColor = (status: 'pending' | 'confirmed' | 'cancelled'): string => {
  const colorMap = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colorMap[status];
};
