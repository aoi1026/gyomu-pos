export type NominationKindForCastList = 'main' | 'inside' | 'together' | null;

/** 出勤中キャスト一覧用：DBの user 行から表示用サブテキストを組み立てる */
export function getCastRealtimeSubtitle(
  cast: {
    hourly_price?: number | string;
    drink_back?: number | string;
    food_back?: number | string;
  },
  _opts?: { nominationType?: NominationKindForCastList }
): string {
  const parts: string[] = [];

  const hourly = Number(cast.hourly_price);
  if (Number.isFinite(hourly) && hourly > 0) {
    parts.push(`時給 ¥${hourly.toLocaleString()}`);
  }

  const db = Number(cast.drink_back);
  const fb = Number(cast.food_back);
  if (Number.isFinite(db) && db > 0) parts.push(`ドリンクバック ${db}%`);
  if (Number.isFinite(fb) && fb > 0) parts.push(`フードバック ${fb}%`);

  return parts.join(' · ');
}
