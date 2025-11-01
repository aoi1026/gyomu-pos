// 顧客指名管理システム
import { Customer, NominationHistory } from './mock-data';

export interface NominationPromotion {
  customer_id: string;
  cast_id: string;
  cast_name: string;
  promotion_type: 'field_to_main' | 'main_change';
  previous_cast_id?: string;
  previous_cast_name?: string;
  notes?: string;
  promoted_at: string;
}

// 場内指名から本指名への昇格
export const promoteFieldToMain = (
  customer: Customer,
  castId: string,
  castName: string,
  notes?: string
): Customer => {
  const now = new Date().toISOString();
  
  // 新しい指名履歴を作成
  const newHistory: NominationHistory = {
    id: `nom-hist-${Date.now()}`,
    customer_id: customer.id,
    cast_id: castId,
    cast_name: castName,
    nomination_type: 'promotion',
    started_at: now,
    notes: notes || '場内指名から本指名に昇格'
  };

  // 既存の本指名を終了
  const updatedHistory = customer.nomination_history.map(history => {
    if (history.nomination_type === 'main' && !history.ended_at) {
      return {
        ...history,
        ended_at: now,
        notes: history.notes ? `${history.notes} (本指名変更により終了)` : '本指名変更により終了'
      };
    }
    return history;
  });

  return {
    ...customer,
    main_nomination_cast_id: castId,
    main_nomination_cast_name: castName,
    nomination_history: [...updatedHistory, newHistory]
  };
};

// 本指名キャストの変更
export const changeMainNomination = (
  customer: Customer,
  newCastId: string,
  newCastName: string,
  notes?: string
): Customer => {
  const now = new Date().toISOString();
  
  // 新しい指名履歴を作成
  const newHistory: NominationHistory = {
    id: `nom-hist-${Date.now()}`,
    customer_id: customer.id,
    cast_id: newCastId,
    cast_name: newCastName,
    nomination_type: 'main',
    started_at: now,
    notes: notes || '本指名キャスト変更'
  };

  // 既存の本指名を終了
  const updatedHistory = customer.nomination_history.map(history => {
    if (history.nomination_type === 'main' && !history.ended_at) {
      return {
        ...history,
        ended_at: now,
        notes: history.notes ? `${history.notes} (本指名変更により終了)` : '本指名変更により終了'
      };
    }
    return history;
  });

  return {
    ...customer,
    main_nomination_cast_id: newCastId,
    main_nomination_cast_name: newCastName,
    nomination_history: [...updatedHistory, newHistory]
  };
};

// 指名履歴の取得
export const getNominationHistory = (customer: Customer): NominationHistory[] => {
  return customer.nomination_history.sort((a, b) => 
    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );
};

// 現在の本指名キャストの取得
export const getCurrentMainNomination = (customer: Customer): NominationHistory | null => {
  return customer.nomination_history.find(history => 
    history.nomination_type === 'main' && !history.ended_at
  ) || null;
};

// 指名統計の取得
export const getNominationStats = (customer: Customer) => {
  const history = customer.nomination_history;
  
  return {
    total_nominations: history.length,
    main_nominations: history.filter(h => h.nomination_type === 'main').length,
    field_nominations: history.filter(h => h.nomination_type === 'field').length,
    promotions: history.filter(h => h.nomination_type === 'promotion').length,
    current_cast: customer.main_nomination_cast_name,
    first_nomination: history.length > 0 ? history[history.length - 1].started_at : null,
    last_nomination: history.length > 0 ? history[0].started_at : null
  };
};

// 顧客の指名履歴を表示用にフォーマット
export const formatNominationHistory = (customer: Customer) => {
  const history = getNominationHistory(customer);
  
  return history.map(h => ({
    ...h,
    type_label: h.nomination_type === 'main' ? '本指名' : 
                h.nomination_type === 'field' ? '場内指名' : '昇格',
    duration: h.ended_at ? 
      Math.ceil((new Date(h.ended_at).getTime() - new Date(h.started_at).getTime()) / (1000 * 60 * 60 * 24)) : 
      '継続中',
    started_at_formatted: new Date(h.started_at).toLocaleDateString('ja-JP'),
    ended_at_formatted: h.ended_at ? new Date(h.ended_at).toLocaleDateString('ja-JP') : '継続中'
  }));
};
