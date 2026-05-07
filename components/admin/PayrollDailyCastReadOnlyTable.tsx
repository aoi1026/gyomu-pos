'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/mock-data';

function formatHours(hours: number) {
  const totalSeconds = Math.max(0, Math.round((Number(hours) || 0) * 3600));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

type Category = { id: number; name: string };
export type PayrollRoundingMode = 'round' | 'floor';
export type PayrollRoundingUnit = 1 | 10 | 100;

function applyPayrollRounding(
  amount: number,
  unit: PayrollRoundingUnit,
  mode: PayrollRoundingMode
) {
  const value = Number(amount) || 0;
  if (unit <= 1) return Math.round(value);
  return mode === 'floor'
    ? Math.floor(value / unit) * unit
    : Math.round(value / unit) * unit;
}

/**
 * /admin/payroll/preview の「日付」検索時と同じ /api/admin/payroll/monthly?date= を使い、
 * キャスト別給与計算表を読み取り専用で表示する。
 */
export default function PayrollDailyCastReadOnlyTable({
  date,
  refreshIntervalMinutes = 15,
  roundingUnit = 1,
  roundingMode = 'round',
}: {
  date: string;
  refreshIntervalMinutes?: number;
  roundingUnit?: PayrollRoundingUnit;
  roundingMode?: PayrollRoundingMode;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [payrollCategories, setPayrollCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    const loadRows = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/admin/payroll/monthly?date=${encodeURIComponent(date)}`, {
          cache: 'no-store',
        });
        const j = await res.json();
        if (cancelled) return;
        if (!j.success) {
          setRows([]);
          setPayrollCategories([]);
          setFetchError(j.error || '読み込みに失敗しました');
          return;
        }
        setRows(Array.isArray(j.rows) ? j.rows : []);
        setPayrollCategories(Array.isArray(j.categories) ? j.categories : []);
      } catch {
        if (!cancelled) {
          setFetchError('通信エラーが発生しました');
          setRows([]);
          setPayrollCategories([]);
        }
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    const intervalMs = Math.max(1, Number(refreshIntervalMinutes) || 15) * 60 * 1000;
    loadRows(true);
    const intervalId = window.setInterval(() => {
      void loadRows(false);
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [date, refreshIntervalMinutes]);

  const roundedTotalPay = (row: any) =>
    applyPayrollRounding(Number(row.total_pay_yen || 0), roundingUnit, roundingMode);
  const roundedRealTotal = (row: any) =>
    roundedTotalPay(row) - Number(row.paid_price || 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return <p className="text-sm text-red-600 py-4">{fetchError}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6">この日付のデータがありません</p>;
  }

  return (
    <div className="w-full min-w-0 max-h-[min(60vh,calc(100vh-22rem))] overflow-auto overscroll-contain">
      <table className="text-xs sm:text-sm divide-y divide-gray-200 w-max">
        <thead className="bg-gray-50">
          <tr className="text-left text-gray-600">
            <th
              rowSpan={2}
              className="p-2 sm:p-3 font-semibold sticky left-0 top-0 bg-gray-50 z-30 min-w-[110px] sm:min-w-[130px] border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
            >
              キャスト
            </th>
            <th rowSpan={2} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sticky top-0 bg-gray-50 z-20">
              勤務時間
            </th>
            <th
              colSpan={5}
              className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap border-l-2 border-gray-300 border-r-2 border-gray-300 sticky top-0 bg-gray-50 z-20"
            >
              控除
            </th>
            <th
              rowSpan={2}
              className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[80px] border-l-2 border-gray-400 sticky top-0 bg-gray-50 z-20"
            >
              ペナルティ
            </th>
            <th rowSpan={2} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-0 bg-gray-50 z-20">
              控除合計
            </th>
            <th rowSpan={2} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sticky top-0 bg-gray-50 z-20">
              時給
            </th>
            <th rowSpan={2} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-0 bg-gray-50 z-20">
              時間給
            </th>
            <th
              colSpan={5 + payrollCategories.length}
              className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap border-l-2 border-gray-300 border-r-2 border-gray-300 sticky top-0 bg-gray-50 z-20"
            >
              バック
            </th>
            <th
              rowSpan={2}
              className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] border-l-2 border-gray-400 sticky top-0 bg-gray-50 z-20"
            >
              ボーナス
            </th>
            <th rowSpan={2} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-0 bg-gray-50 z-20">
              ポイント
            </th>
            <th
              rowSpan={2}
              className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[95px] border-r-2 border-gray-300 sticky top-0 bg-gray-50 z-20"
            >
              追加ポイント
            </th>
            <th rowSpan={2} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-0 bg-gray-50 z-20">
              バック合計
            </th>
            <th rowSpan={2} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-0 bg-gray-50 z-20">
              合計
            </th>
            <th
              rowSpan={2}
              className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] border-l border-gray-200 sticky top-0 bg-gray-50 z-20"
            >
              未払い
            </th>
          </tr>
          <tr className="text-left text-gray-600 border-t-2 border-gray-400">
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] border-l-2 border-gray-300 sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">
              前借日払
            </th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">送迎</th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[80px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">ヘアメイク</th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">レンタル</th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] border-r-2 border-gray-300 sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">
              その他
            </th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] border-l-2 border-gray-300 sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">
              本指名
            </th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">本指名延長</th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">場内指名</th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">場内指名延長</th>
            <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">同伴</th>
            {payrollCategories.map((c) => (
              <th key={c.id} className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sticky top-[38px] sm:top-[46px] bg-gray-50 z-20">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user_id} className="border-t hover:bg-gray-50 transition-colors">
              <td className="p-2 sm:p-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                <div className="font-medium text-sm">{row.name}</div>
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                <div className="text-xs sm:text-sm text-gray-700">{formatHours(row.basic_hours)}</div>
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap border-l-2 border-gray-300">
                {formatCurrency(Number(row.paid_price || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">{formatCurrency(Number(row.pickup_yen || 0))}</td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">{formatCurrency(Number(row.hairmake_yen || 0))}</td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">{formatCurrency(Number(row.rental_yen || 0))}</td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap border-r-2 border-gray-300">
                {formatCurrency(Number(row.other_deduct_yen || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap border-l-2 border-gray-400">
                {formatCurrency(Number(row.penalty_yen || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">
                {formatCurrency(Number(row.deduction_yen || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                {formatCurrency(Number(row.hourly_price || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                {formatCurrency(Number(row.base_pay || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap border-l-2 border-gray-300">
                <div className="leading-tight">
                  <div className="text-[10px] text-gray-600">{Number(row.main_nomination_count || 0)}</div>
                  <div className="font-semibold">{formatCurrency(Number(row.main_nomination_fee || 0))}</div>
                </div>
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                <div className="leading-tight">
                  <div className="text-[10px] text-gray-600">{Number(row.main_nomination_extension_count || 0)}</div>
                  <div className="font-semibold">{formatCurrency(Number(row.main_nomination_extension_fee || 0))}</div>
                </div>
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                <div className="leading-tight">
                  <div className="text-[10px] text-gray-600">{Number(row.inside_nomination_count || 0)}</div>
                  <div className="font-semibold">{formatCurrency(Number(row.inside_nomination_fee || 0))}</div>
                </div>
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                <div className="leading-tight">
                  <div className="text-[10px] text-gray-600">{Number(row.inside_nomination_extension_count || 0)}</div>
                  <div className="font-semibold">{formatCurrency(Number(row.inside_nomination_extension_fee || 0))}</div>
                </div>
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                <div className="leading-tight">
                  <div className="text-[10px] text-gray-600">{Number(row.together_nomination_count || 0)}</div>
                  <div className="font-semibold">{formatCurrency(Number(row.together_nomination_fee || 0))}</div>
                </div>
              </td>
              {payrollCategories.map((c) => (
                <td key={c.id} className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                  <div className="leading-tight">
                    <div className="text-[10px] text-gray-600">
                      {Number(row.categoryAmounts?.[c.id] ?? row.categoryAmounts?.[String(c.id)] ?? 0)}
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(Number(row.categoryTotals?.[c.id] ?? row.categoryTotals?.[String(c.id)] ?? 0))}
                    </div>
                  </div>
                </td>
              ))}
              <td className="p-2 sm:p-3 text-center whitespace-nowrap border-l-2 border-gray-400">
                {formatCurrency(Number(row.bonus_yen || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap">{formatCurrency(Number(row.point_yen || 0))}</td>
              <td className="p-2 sm:p-3 text-center whitespace-nowrap border-r-2 border-gray-300">
                {formatCurrency(Number(row.additional_point_yen || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">
                {formatCurrency(Number(row.back_total || 0))}
              </td>
              <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">
                {formatCurrency(roundedTotalPay(row))}
              </td>
              <td className="p-2 sm:p-3 text-center font-bold text-xs sm:text-sm whitespace-nowrap border-l border-gray-200">
                {formatCurrency(roundedRealTotal(row))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr className="border-t-2 border-gray-300 font-semibold">
            <td className="p-2 sm:p-3 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
              合計
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatHours(rows.reduce((sum, r) => sum + Number(r.basic_hours || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap border-l-2 border-gray-300">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.paid_price || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.pickup_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.hairmake_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.rental_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap border-r-2 border-gray-300">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.other_deduct_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.penalty_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.deduction_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap text-gray-500">-</td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.base_pay || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center whitespace-nowrap border-l-2 border-gray-300">
              <div className="leading-tight">
                <div className="text-[10px] text-gray-600">
                  {rows.reduce((sum, r) => sum + Number(r.main_nomination_count || 0), 0)}
                </div>
                <div className="text-xs sm:text-sm">
                  {formatCurrency(rows.reduce((sum, r) => sum + Number(r.main_nomination_fee || 0), 0))}
                </div>
              </div>
            </td>
            <td className="p-2 sm:p-3 text-center whitespace-nowrap">
              <div className="leading-tight">
                <div className="text-[10px] text-gray-600">
                  {rows.reduce((sum, r) => sum + Number(r.main_nomination_extension_count || 0), 0)}
                </div>
                <div className="text-xs sm:text-sm">
                  {formatCurrency(rows.reduce((sum, r) => sum + Number(r.main_nomination_extension_fee || 0), 0))}
                </div>
              </div>
            </td>
            <td className="p-2 sm:p-3 text-center whitespace-nowrap">
              <div className="leading-tight">
                <div className="text-[10px] text-gray-600">
                  {rows.reduce((sum, r) => sum + Number(r.inside_nomination_count || 0), 0)}
                </div>
                <div className="text-xs sm:text-sm">
                  {formatCurrency(rows.reduce((sum, r) => sum + Number(r.inside_nomination_fee || 0), 0))}
                </div>
              </div>
            </td>
            <td className="p-2 sm:p-3 text-center whitespace-nowrap">
              <div className="leading-tight">
                <div className="text-[10px] text-gray-600">
                  {rows.reduce((sum, r) => sum + Number(r.inside_nomination_extension_count || 0), 0)}
                </div>
                <div className="text-xs sm:text-sm">
                  {formatCurrency(rows.reduce((sum, r) => sum + Number(r.inside_nomination_extension_fee || 0), 0))}
                </div>
              </div>
            </td>
            <td className="p-2 sm:p-3 text-center whitespace-nowrap">
              <div className="leading-tight">
                <div className="text-[10px] text-gray-600">
                  {rows.reduce((sum, r) => sum + Number(r.together_nomination_count || 0), 0)}
                </div>
                <div className="text-xs sm:text-sm">
                  {formatCurrency(rows.reduce((sum, r) => sum + Number(r.together_nomination_fee || 0), 0))}
                </div>
              </div>
            </td>
            {payrollCategories.map((c) => (
              <td key={c.id} className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                <div className="leading-tight">
                  <div className="text-[10px] text-gray-600">
                    {rows.reduce(
                      (sum, r) => sum + Number(r.categoryAmounts?.[c.id] ?? r.categoryAmounts?.[String(c.id)] ?? 0),
                      0
                    )}
                  </div>
                  <div>
                    {formatCurrency(
                      rows.reduce((sum, r) => {
                        const v = Number(r.categoryTotals?.[c.id] ?? r.categoryTotals?.[String(c.id)] ?? 0);
                        return sum + (Number.isFinite(v) ? v : 0);
                      }, 0)
                    )}
                  </div>
                </div>
              </td>
            ))}
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap border-l-2 border-gray-400">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.bonus_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.point_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap border-r-2 border-gray-300">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.additional_point_yen || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + Number(r.back_total || 0), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(rows.reduce((sum, r) => sum + roundedTotalPay(r), 0))}
            </td>
            <td className="p-2 sm:p-3 text-center font-bold text-xs sm:text-sm whitespace-nowrap border-l border-gray-200">
              {formatCurrency(rows.reduce((sum, r) => sum + roundedRealTotal(r), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
