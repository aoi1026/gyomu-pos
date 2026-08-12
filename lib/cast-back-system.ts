// キャストバック率管理システム
export interface CastBackRate {
  id: string;
  cast_id: string;
  cast_name: string;
  food_back_rate: number; // フードバック率 (0.05 = 5%)
  drink_back_rate: number; // ドリンクバック率 (0.10 = 10%)
  nomination_rate: number; // 本指名料率 (0.15 = 15%)
  field_nomination_rate: number; // 場内指名料率 (0.08 = 8%)
  effective_from: string; // 適用開始日
  effective_to?: string; // 適用終了日（未設定の場合は現在有効）
  created_at: string;
  updated_at: string;
}

export interface BackCalculation {
  item_type: 'drink' | 'bottle' | 'nomination' | 'field_nomination';
  base_amount: number;
  back_rate: number;
  back_amount: number;
  cast_id: string;
  cast_name: string;
  nomination_type?: 'main' | 'field' | 'free'; // 指名区分
}

// モックデータ - mock-data.tsと同期
export const mockCastBackRates: CastBackRate[] = [
  {
    id: 'back-rate-1',
    cast_id: 'staff-1',
    cast_name: '田中美咲',
    food_back_rate: 0.05, // 5%
    drink_back_rate: 0.10, // 10%
    nomination_rate: 0.15, // 15%
    field_nomination_rate: 0.08, // 8%
    effective_from: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'back-rate-2',
    cast_id: 'staff-2',
    cast_name: '佐藤花音',
    food_back_rate: 0.05,
    drink_back_rate: 0.10,
    nomination_rate: 0.15,
    field_nomination_rate: 0.08,
    effective_from: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'back-rate-3',
    cast_id: 'staff-3',
    cast_name: '鈴木愛美',
    food_back_rate: 0.06, // 6%
    drink_back_rate: 0.12, // 12%
    nomination_rate: 0.18, // 18%
    field_nomination_rate: 0.10, // 10%
    effective_from: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'back-rate-4',
    cast_id: 'staff-4',
    cast_name: '高橋麻衣',
    food_back_rate: 0.04, // 4%
    drink_back_rate: 0.08, // 8%
    nomination_rate: 0.12, // 12%
    field_nomination_rate: 0.06, // 6%
    effective_from: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

// 現在有効なバック率を取得
export const getCurrentBackRate = (castId: string): CastBackRate | null => {
  const now = new Date().toISOString().split('T')[0];
  
  return mockCastBackRates.find(rate => 
    rate.cast_id === castId && 
    rate.effective_from <= now &&
    (!rate.effective_to || rate.effective_to >= now)
  ) || null;
};

// バック計算
export const calculateBack = (
  castId: string,
  itemType: 'drink' | 'bottle' | 'nomination' | 'field_nomination',
  amount: number,
  nominationType?: 'main' | 'field' | 'free'
): BackCalculation | null => {
  const backRate = getCurrentBackRate(castId);
  if (!backRate) return null;

  let rate: number;
  let actualItemType = itemType;

  // 指名種別に応じてバック率を調整
  if (itemType === 'drink' || itemType === 'bottle') {
    if (nominationType === 'main') {
      // 本指名の場合は通常のバック率
      rate = itemType === 'drink' ? backRate.food_back_rate : backRate.drink_back_rate;
    } else if (nominationType === 'field') {
      // 場内指名の場合は場内指名率を適用
      rate = backRate.field_nomination_rate;
    } else {
      // フリーの場合は通常のバック率
      rate = itemType === 'drink' ? backRate.food_back_rate : backRate.drink_back_rate;
    }
  } else {
    // 指名料の場合は指名種別に応じて
    if (itemType === 'nomination') {
      rate = backRate.nomination_rate;
    } else if (itemType === 'field_nomination') {
      rate = backRate.field_nomination_rate;
    } else {
      return null;
    }
  }

  return {
    item_type: actualItemType,
    base_amount: amount,
    back_rate: rate,
    back_amount: Math.round(amount * rate),
    cast_id: castId,
    cast_name: backRate.cast_name,
    nomination_type: nominationType
  };
};

// 複数アイテムのバック計算
export const calculateMultipleBacks = (
  items: Array<{
    cast_id: string;
    item_type: 'drink' | 'bottle' | 'nomination' | 'field_nomination';
    amount: number;
  }>
): BackCalculation[] => {
  return items
    .map(item => calculateBack(item.cast_id, item.item_type, item.amount))
    .filter((back): back is BackCalculation => back !== null);
};

// バック率の更新
export const updateBackRate = async (
  castId: string,
  newRates: Partial<Pick<CastBackRate, 'food_back_rate' | 'drink_back_rate' | 'nomination_rate' | 'field_nomination_rate'>>,
  effectiveFrom: string
): Promise<CastBackRate> => {
  // 現在のレートを終了
  const currentRate = getCurrentBackRate(castId);
  if (currentRate) {
    const endDate = new Date(effectiveFrom);
    endDate.setDate(endDate.getDate() - 1);
    
    // 実際のAPIでは既存レートを更新
    console.log('Ending current rate:', currentRate.id, 'on', endDate.toISOString().split('T')[0]);
  }

  // 新しいレートを作成
  const newRate: CastBackRate = {
    id: `back-rate-${Date.now()}`,
    cast_id: castId,
    cast_name: currentRate?.cast_name || `Cast ${castId.slice(-4)}`,
    food_back_rate: newRates.food_back_rate ?? currentRate?.food_back_rate ?? 0.05,
    drink_back_rate: newRates.drink_back_rate ?? currentRate?.drink_back_rate ?? 0.10,
    nomination_rate: newRates.nomination_rate ?? currentRate?.nomination_rate ?? 0.15,
    field_nomination_rate: newRates.field_nomination_rate ?? currentRate?.field_nomination_rate ?? 0.08,
    effective_from: effectiveFrom,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 実際のAPIでは新しいレートを保存
  console.log('Creating new rate:', newRate);
  
  return newRate;
};

// バック率履歴の取得
export const getBackRateHistory = (castId: string): CastBackRate[] => {
  return mockCastBackRates
    .filter(rate => rate.cast_id === castId)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
};

// 全キャストの現在のバック率を取得
export const getAllCurrentBackRates = (): CastBackRate[] => {
  const now = new Date().toISOString().split('T')[0];
  const castIds = Array.from(new Set(mockCastBackRates.map(rate => rate.cast_id)));
  
  return castIds
    .map(castId => getCurrentBackRate(castId))
    .filter((rate): rate is CastBackRate => rate !== null);
};

// バック率の検証
export const validateBackRate = (rate: Partial<CastBackRate>): string[] => {
  const errors: string[] = [];
  
  if (rate.food_back_rate !== undefined) {
    if (rate.food_back_rate < 0 || rate.food_back_rate > 1) {
      errors.push('フードバック率は0-100%の範囲で設定してください');
    }
  }
  
  if (rate.drink_back_rate !== undefined) {
    if (rate.drink_back_rate < 0 || rate.drink_back_rate > 1) {
      errors.push('ドリンクバック率は0-100%の範囲で設定してください');
    }
  }
  
  if (rate.nomination_rate !== undefined) {
    if (rate.nomination_rate < 0 || rate.nomination_rate > 1) {
      errors.push('本指名料率は0-100%の範囲で設定してください');
    }
  }
  
  if (rate.field_nomination_rate !== undefined) {
    if (rate.field_nomination_rate < 0 || rate.field_nomination_rate > 1) {
      errors.push('場内指名料率は0-100%の範囲で設定してください');
    }
  }
  
  return errors;
};

// パーセンテージフォーマット
export const formatBackRate = (rate: number): string => {
  return `${(rate * 100).toFixed(1)}%`;
};

// バック金額のフォーマット
export const formatBackAmount = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0
  }).format(amount);
};
