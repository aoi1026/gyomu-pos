'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Calculator, Download, Lock, Unlock, Users,
  DollarSign, Clock, TrendingUp, FileText, Printer as PrinterIcon, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  mockPayrollRuns, mockPayrollItems, formatCurrency, formatDate,
  PayrollRun, PayrollItem
} from '@/lib/mock-data';
import { useNotificationContext } from '@/lib/notification-context';
import { usePrinter } from '@/lib/printer-context';
import { buildEscPosRasterReceipt } from '@/lib/printing/escpos-raster';
import type { ReceiptPayload } from '@/lib/printing/escpos-raster';
import { printReceiptViaOs, previewReceiptInWindow } from '@/lib/printing/os-print';
import { fetchStoreName, fetchStoreAddress, fetchStorePhone } from '@/lib/printing/receipt-builders';

export default function PayrollPreviewPage() {
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [periodStart, setPeriodStart] = useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dateMode, setDateMode] = useState<'month' | 'range' | 'date'>('month');
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingRowKey, setPrintingRowKey] = useState<string | null>(null);
  const [monthlyRows, setMonthlyRows] = useState<any[]>([]);
  const [rowUnlocked, setRowUnlocked] = useState<Record<number, boolean>>({});
  const autoSaveTimers = useRef<Record<number, any>>({});
  const rowLockTimers = useRef<Record<number, any>>({});
  const [castSearchQuery, setCastSearchQuery] = useState<string>('');
  const [expandedDailyRows, setExpandedDailyRows] = useState<Record<number, boolean>>({});
  const [dailyRowsData, setDailyRowsData] = useState<Record<number, any[]>>({});
  /** DBのstore_address・store_telでペイロードを補完 */
  const enrichPayloadWithStoreInfo = async (payload: ReceiptPayload): Promise<ReceiptPayload> => {
    const [address, phone] = await Promise.all([fetchStoreAddress(), fetchStorePhone()]);
    return {
      ...payload,
      footerAddress: address || undefined,
      footerPhone: phone || undefined,
    };
  };

  const doPrint = async (getPayload: () => Promise<ReceiptPayload | ReceiptPayload[]>) => {
    const result = await getPayload();
    const raw = Array.isArray(result) ? result : [result];
    const payloads = await Promise.all(raw.map((p) => enrichPayloadWithStoreInfo(p)));
    if (printer.status === 'connected') {
      for (const p of payloads) await printer.write(buildEscPosRasterReceipt(p));
    } else {
      printReceiptViaOs(payloads);
    }
  };

  const doPreview = async (getPayload: () => Promise<ReceiptPayload | ReceiptPayload[]>) => {
    const result = await getPayload();
    const raw = Array.isArray(result) ? result : [result];
    const payloads = await Promise.all(raw.map((p) => enrichPayloadWithStoreInfo(p)));
    previewReceiptInWindow(payloads);
  };
  const fetchMonthlyRows = async (year: number, month: number, useSessions?: boolean, saveOnLoad?: boolean) => {
    try {
      const qs = new URLSearchParams();
      if (dateMode === 'month') {
        qs.set('year', String(year));
        qs.set('month', String(month));
      } else if (dateMode === 'range') {
        if (periodStart) qs.set('start', periodStart);
        if (periodEnd) qs.set('end', periodEnd);
      } else {
        if (singleDate) qs.set('date', singleDate);
      }
      if (useSessions) qs.set('source', 'sessions');
      const res = await fetch(`/api/admin/payroll/monthly?${qs.toString()}`);
      const result = await res.json();
      if (result.success) {
        setMonthlyRows(result.rows);
        if (saveOnLoad && dateMode === 'month') {
          // 初期表示時に全行を保存（UPSERT）
          try {
            await Promise.all(
              result.rows.map((r: any) => saveRowData(r))
            );
            // info('初期保存', '読み込んだ給与データを保存しました');
          } catch (e) {
            console.error('初期保存エラー:', e);
          }
        }
      } else {
        console.error('給与データ取得失敗:', result.error);
        if (result.error && result.error.includes('マイグレーション')) {
          error('データベースエラー', result.error);
        }
        setMonthlyRows([]);
      }
    } catch (err) {
      console.error('給与データ取得エラー:', err);
      setMonthlyRows([]);
    }
  };
  const saveRowData = async (row: any) => {
    try {
      const payload = {
        user_id: row.user_id,
        year: selectedYear,
        month: selectedMonth,
        basic_hours: Number(row.basic_hours || 0),
        base_pay: Number(row.base_pay || 0),
        main_nomination_count: Number(row.main_nomination_count || 0),
        main_nomination_fee: Number(row.main_nomination_fee || 0),
        inside_nomination_count: Number(row.inside_nomination_count || 0),
        inside_nomination_fee: Number(row.inside_nomination_fee || 0),
        together_nomination_cost: Number(row.together_nomination_cost || 0),
        together_nomination_count: Number(row.together_nomination_count || 0),
        together_nomination_fee: Number(row.together_nomination_fee || 0),
        sales_back_yen: Number(row.sales_back_yen || 0),
        overtime_wage_yen: Number(row.overtime_wage_yen || 0),
        deduction_yen: Number(row.deduction_yen || 0),
        paid_price: Number(row.paid_price || 0),
        realTotal_price: Number(row.realTotal_price || 0)
      };
      await fetch('/api/admin/payroll/monthly', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // 静かに失敗（連続入力時のノイズ回避）
      console.error('Auto-save failed', e);
    }
  };
  const scheduleAutoSave = (row: any) => {
    const key = row.user_id as number;
    if (autoSaveTimers.current[key]) {
      clearTimeout(autoSaveTimers.current[key]);
    }
    autoSaveTimers.current[key] = setTimeout(() => {
      saveRowData(row);
      delete autoSaveTimers.current[key];
    }, 500);
  };

  const lockRow = (userId: number) => {
    setRowUnlocked((prev) => ({ ...prev, [userId]: false }));
    if (rowLockTimers.current[userId]) {
      clearTimeout(rowLockTimers.current[userId]);
      delete rowLockTimers.current[userId];
    }
  };

  const ensureAutoRelock = (userId: number) => {
    if (rowLockTimers.current[userId]) {
      clearTimeout(rowLockTimers.current[userId]);
    }
    rowLockTimers.current[userId] = setTimeout(() => {
      lockRow(userId);
    }, 60000);
  };

  const toggleRowLock = (userId: number) => {
    setRowUnlocked((prev) => {
      const next = !prev[userId];
      if (next) {
        ensureAutoRelock(userId);
      } else {
        if (rowLockTimers.current[userId]) {
          clearTimeout(rowLockTimers.current[userId]);
          delete rowLockTimers.current[userId];
        }
      }
      return { ...prev, [userId]: next };
    });
  };

  const castTotals = useMemo(() => {
    const sumHours = monthlyRows.reduce((s, r) => s + Number(r.basic_hours || 0), 0);
    const sumMain = monthlyRows.reduce((s, r) => s + Number(r.main_nomination_count || 0), 0);
    const sumInside = monthlyRows.reduce((s, r) => s + Number(r.inside_nomination_count || 0), 0);
    const sumPay = monthlyRows.reduce((s, r) => (
      s +
      (Number(r.base_pay || 0) +
       Number(r.main_nomination_fee || 0) +
       Number(r.inside_nomination_fee || 0) +
       Number(r.together_nomination_fee || 0) +
         Number(r.sales_back_yen || 0) +
       Number(r.overtime_wage_yen || 0) -
       Number(r.deduction_yen || 0))
    ), 0);
    return {
      staffCount: monthlyRows.length,
      sumHours,
      sumNominations: sumMain + sumInside,
      sumPay
    };
  }, [monthlyRows]);

  const downloadCsv = () => {
    try {
      const headers = [
        'キャスト',
        '基本時間(時間)',
        '基本給(円)',
        '本指名数(件)',
        '本指名料(円)',
        '場内指名数(件)',
        '場内指名料(円)',
        '同伴者(件)',
        '同伴料(円)',
        '売上バック(円)',
        '残業代(円)',
        '控除(円)',
        '支給額(円)'
      ];
      const lines = [headers.join(',')];
      let sumHours = 0, sumBasePay = 0, sumMainCnt = 0, sumMainFee = 0, sumInsideCnt = 0, sumInsideFee = 0, sumTogetherCnt = 0, sumTogetherFee = 0, sumBottle = 0, sumDrink = 0, sumOver = 0, sumDeduct = 0, sumTotal = 0;
      monthlyRows.forEach((r) => {
        const hours = Number(r.basic_hours || 0);
        const basePay = Number(r.base_pay || 0);
        const mainCnt = Number(r.main_nomination_count || 0);
        const mainFee = Number(r.main_nomination_fee || 0);
        const insideCnt = Number(r.inside_nomination_count || 0);
        const insideFee = Number(r.inside_nomination_fee || 0);
        const togetherCnt = Number(r.together_nomination_count || 0);
        const togetherFee = Number(r.together_nomination_fee || 0);
        const bottle = Number(r.sales_back_yen || 0);
        const drink = 0;
        const over = Number(r.overtime_wage_yen || 0);
        const deduct = Number(r.deduction_yen || 0);
        const total = basePay + mainFee + insideFee + togetherFee + bottle + drink + over - deduct;

        sumHours += hours; sumBasePay += basePay; sumMainCnt += mainCnt; sumMainFee += mainFee; sumInsideCnt += insideCnt; sumInsideFee += insideFee; sumTogetherCnt += togetherCnt; sumTogetherFee += togetherFee; sumBottle += bottle; sumDrink += drink; sumOver += over; sumDeduct += deduct; sumTotal += total;

        const row = [
          (r.name ?? ''),
          String(hours),
          String(basePay),
          String(mainCnt),
          String(mainFee),
          String(insideCnt),
          String(insideFee),
          String(togetherCnt),
          String(togetherFee),
          String(bottle),
          String(over),
          String(deduct),
          String(total)
        ];
        const escaped = row.map((v) => {
          const s = String(v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        });
        lines.push(escaped.join(','));
      });

      // 合計行を追加
      const totalRow = [
        '合計',
        String(sumHours),
        String(sumBasePay),
        String(sumMainCnt),
        String(sumMainFee),
        String(sumInsideCnt),
        String(sumInsideFee),
        String(sumTogetherCnt),
        String(sumTogetherFee),
        String(sumBottle),
        String(sumOver),
        String(sumDeduct),
        String(sumTotal)
      ];
      const escapedTotal = totalRow.map((v) => {
        const s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      lines.push(escapedTotal.join(','));
      const content = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      error('CSV出力エラー', 'CSVの生成に失敗しました');
    }
  };
  const formatHours = (hours: number) => {
    const totalSeconds = Math.max(0, Math.round((Number(hours) || 0) * 3600));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // 1日を加算（JavaScriptのDateオブジェクトが自動的に月をまたいだ場合を処理）
    date.setDate(date.getDate() + 1);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchDailyRows = async (userId: number) => {
    try {
      let startDate: string;
      let endDate: string;

      if (dateMode === 'month') {
        const year = selectedYear;
        const month = selectedMonth;
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      } else if (dateMode === 'range') {
        startDate = periodStart;
        endDate = periodEnd;
      } else {
        startDate = singleDate;
        endDate = singleDate;
      }

      const qs = new URLSearchParams();
      qs.set('user_id', String(userId));
      qs.set('start', startDate);
      qs.set('end', endDate);

      const res = await fetch(`/api/admin/payroll/daily?${qs.toString()}`);
      const result = await res.json();
      if (result.success) {
        setDailyRowsData((prev) => ({ ...prev, [userId]: result.rows }));
      } else {
        console.error('日別給与データ取得失敗:', result.error);
        setDailyRowsData((prev) => ({ ...prev, [userId]: [] }));
      }
    } catch (err) {
      console.error('日別給与データ取得エラー:', err);
      setDailyRowsData((prev) => ({ ...prev, [userId]: [] }));
    }
  };

  const toggleDailyRows = (userId: number) => {
    const isExpanded = expandedDailyRows[userId];
    if (!isExpanded) {
      // 展開する場合、データを取得
      fetchDailyRows(userId);
    }
    setExpandedDailyRows((prev) => ({ ...prev, [userId]: !isExpanded }));
  };
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [editValues, setEditValues] = useState({
    base_hours: 0,
    nomination_count: 0,
    field_nomination_count: 0,
    sales_back_yen: 0,
    overtime_wage_yen: 0,
    deduction_yen: 0
  });
  
  const router = useRouter();
  const { success, error, confirm, info } = useNotificationContext();
  const printer = usePrinter();

  const searchConditionText = useMemo(() => {
    if (dateMode === 'date') return `日付: ${singleDate}`;
    if (dateMode === 'range') return `期間: ${periodStart} 〜 ${periodEnd}`;
    return `月: ${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [dateMode, singleDate, periodStart, periodEnd, selectedYear, selectedMonth]);


  const getPayloadForMonthlyRow = async (row: any): Promise<ReceiptPayload> => {
    const storeName = await fetchStoreName();
    const issuedAt = new Date();
    return {
      storeName,
      tableName: '給与計算',
      title: `キャスト別給与（${row?.name ?? ''}）`,
      issuedAt,
      lines: [
        { left: '検索条件', right: searchConditionText },
        { left: 'キャスト名', right: String(row?.name ?? '') },
        { left: '基本時間', right: String(row?.basic_hours ?? 0) },
        { left: '基本給', right: formatCurrency(Number(row?.base_pay || 0)) },
        { left: '本指名数', right: String(Number(row?.main_nomination_count || 0)) },
        { left: '本指名料', right: formatCurrency(Number(row?.main_nomination_fee || 0)) },
        { left: '場内指名数', right: String(Number(row?.inside_nomination_count || 0)) },
        { left: '場内指名料', right: formatCurrency(Number(row?.inside_nomination_fee || 0)) },
        { left: '同伴者', right: String(Number(row?.together_nomination_count || 0)) },
        { left: '同伴料', right: formatCurrency(Number(row?.together_nomination_fee || 0)) },
        { left: '売上バック', right: formatCurrency(Number(row?.sales_back_yen || 0)) },
        { left: '残業代', right: formatCurrency(Number(row?.overtime_wage_yen || 0)) },
        { left: '控除', right: formatCurrency(Number(row?.deduction_yen || 0)) },
        { left: '支給額', right: formatCurrency(Number(row?.total_pay_yen || 0)) },
        { left: '前払い', right: formatCurrency(Number(row?.paid_price || 0)) },
      ],
      totalLabel: '総額',
      totalAmount: Number(row?.realTotal_price ?? (Number(row?.total_pay_yen || 0) - Number(row?.paid_price || 0))),
    };
  };

  const handlePrintMonthlyRow = async (row: any) => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      await doPrint(() => getPayloadForMonthlyRow(row));
      success('印刷', '印刷しました');
    } catch (e: any) {
      error('印刷に失敗しました', e?.message || String(e));
    } finally {
      setIsPrinting(false);
    }
  };
  const handlePreviewMonthlyRow = async (row: any) => {
    try {
      await doPreview(() => getPayloadForMonthlyRow(row));
    } catch (e: any) {
      error('プレビューに失敗しました', e?.message || String(e));
    }
  };

  const getPayloadForDailyBreakdown = async (row: any): Promise<ReceiptPayload> => {
    const dailyRows = dailyRowsData[row.user_id] || [];
    const storeName = await fetchStoreName();
    const issuedAt = new Date();
    const lines: { left: string; right?: string }[] = [
      { left: '検索条件', right: searchConditionText },
      { left: 'キャスト名', right: String(row?.name ?? '') },
      { left: '--- 日別内訳 ---' },
    ];
    let sumRealTotal = 0;
    for (const dr of dailyRows) {
      const totalPay =
        Number(dr.base_pay || 0) +
        Number(dr.main_nomination_fee || 0) +
        Number(dr.inside_nomination_fee || 0) +
        Number(dr.together_nomination_fee || 0) +
        Number(dr.sales_back_yen || 0) +
        Number(dr.overtime_wage_yen || 0) -
        Number(dr.deduction_yen || 0);
      const paid = Number(dr.paid_price || 0);
      const realTotal = totalPay - paid;
      sumRealTotal += realTotal;
      lines.push({ left: `${formatDisplayDate(dr.date)}`, right: formatCurrency(realTotal) });
    }
    lines.push({ left: '---' });
    return { storeName, tableName: '給与計算', title: `日別内訳（${row?.name ?? ''}）`, issuedAt, lines, totalLabel: '総額', totalAmount: sumRealTotal };
  };

  const handlePrintDailyBreakdown = async (row: any) => {
    if (isPrinting) return;
    const dailyRows = dailyRowsData[row.user_id];
    if (!dailyRows?.length) {
      info('印刷', '日別内訳データがありません');
      return;
    }
    setIsPrinting(true);
    try {
      await doPrint(() => getPayloadForDailyBreakdown(row));
      success('印刷', '印刷しました');
    } catch (e: any) {
      error('印刷に失敗しました', e?.message || String(e));
    } finally {
      setIsPrinting(false);
    }
  };
  const handlePreviewDailyBreakdown = async (row: any) => {
    const dailyRows = dailyRowsData[row.user_id];
    if (!dailyRows?.length) {
      info('印刷', '日別内訳データがありません');
      return;
    }
    try {
      await doPreview(() => getPayloadForDailyBreakdown(row));
    } catch (e: any) {
      error('プレビューに失敗しました', e?.message || String(e));
    }
  };

  const getPayloadForMonthlyAll = async (): Promise<ReceiptPayload[]> => {
    const storeName = await fetchStoreName();
    const issuedAt = new Date();
    const summary: ReceiptPayload = {
      storeName,
      tableName: '給与計算',
      title: 'キャスト別給与（一覧）',
      issuedAt,
      lines: [{ left: '検索条件', right: searchConditionText }, { left: '件数', right: String(monthlyRows.length) }],
      totalLabel: '総額合計',
      totalAmount: monthlyRows.reduce((sum, r) => sum + (Number(r?.realTotal_price ?? (Number(r?.total_pay_yen || 0) - Number(r?.paid_price || 0))) || 0), 0),
    };
    const rowPayloads = await Promise.all(monthlyRows.map((r) => getPayloadForMonthlyRow(r)));
    return [summary, ...rowPayloads];
  };

  const handlePrintMonthlyAll = async () => {
    if (isPrinting) return;
    if (!monthlyRows.length) {
      info('印刷', '印刷するデータがありません');
      return;
    }
    setIsPrinting(true);
    try {
      await doPrint(getPayloadForMonthlyAll);
      success('印刷', '印刷しました');
    } catch (e: any) {
      error('印刷に失敗しました', e?.message || String(e));
    } finally {
      setIsPrinting(false);
    }
  };
  const handlePreviewMonthlyAll = async () => {
    if (!monthlyRows.length) {
      info('印刷', '印刷するデータがありません');
      return;
    }
    try {
      await doPreview(getPayloadForMonthlyAll);
    } catch (e: any) {
      error('プレビューに失敗しました', e?.message || String(e));
    }
  };

  const getPayloadForMonthlyTotals = async (): Promise<ReceiptPayload> => {
    const sumHours = monthlyRows.reduce((sum, r) => sum + Number(r.basic_hours || 0), 0);
    const sumBasePay = monthlyRows.reduce((sum, r) => sum + Number(r.base_pay || 0), 0);
    const sumMainCnt = monthlyRows.reduce((sum, r) => sum + Number(r.main_nomination_count || 0), 0);
    const sumMainFee = monthlyRows.reduce((sum, r) => sum + Number(r.main_nomination_fee || 0), 0);
    const sumInsideCnt = monthlyRows.reduce((sum, r) => sum + Number(r.inside_nomination_count || 0), 0);
    const sumInsideFee = monthlyRows.reduce((sum, r) => sum + Number(r.inside_nomination_fee || 0), 0);
    const sumTogetherCnt = monthlyRows.reduce((sum, r) => sum + Number(r.together_nomination_count || 0), 0);
    const sumTogetherFee = monthlyRows.reduce((sum, r) => sum + Number(r.together_nomination_fee || 0), 0);
    const sumSalesBack = monthlyRows.reduce((sum, r) => sum + Number(r.sales_back_yen || 0), 0);
    const sumOvertime = monthlyRows.reduce((sum, r) => sum + Number(r.overtime_wage_yen || 0), 0);
    const sumDeduction = monthlyRows.reduce((sum, r) => sum + Number(r.deduction_yen || 0), 0);
    const sumTotalPay = monthlyRows.reduce(
      (sum, r) =>
        sum +
        Number(r.base_pay || 0) +
        Number(r.main_nomination_fee || 0) +
        Number(r.inside_nomination_fee || 0) +
        Number(r.together_nomination_fee || 0) +
        Number(r.sales_back_yen || 0) +
        Number(r.overtime_wage_yen || 0) -
        Number(r.deduction_yen || 0),
      0
    );
    const sumPaid = monthlyRows.reduce((sum, r) => sum + Number(r.paid_price || 0), 0);
    const sumRealTotal = monthlyRows.reduce(
      (sum, r) =>
        sum +
        ((Number(r.base_pay || 0) +
          Number(r.main_nomination_fee || 0) +
          Number(r.inside_nomination_fee || 0) +
          Number(r.together_nomination_fee || 0) +
          Number(r.sales_back_yen || 0) +
          Number(r.overtime_wage_yen || 0) -
          Number(r.deduction_yen || 0)) -
          Number(r.paid_price || 0)),
      0
    );
    const storeName = await fetchStoreName();
    const issuedAt = new Date();
    return {
      storeName,
      tableName: '給与計算',
      title: 'キャスト別給与（合計）',
      issuedAt,
      lines: [
        { left: '検索条件', right: searchConditionText },
        { left: '件数', right: String(monthlyRows.length) },
        { left: '基本時間(合計)', right: formatHours(sumHours) },
        { left: '基本給(合計)', right: formatCurrency(sumBasePay) },
        { left: '本指名数(合計)', right: String(sumMainCnt) },
        { left: '本指名料(合計)', right: formatCurrency(sumMainFee) },
        { left: '場内指名数(合計)', right: String(sumInsideCnt) },
        { left: '場内指名料(合計)', right: formatCurrency(sumInsideFee) },
        { left: '同伴者(合計)', right: String(sumTogetherCnt) },
        { left: '同伴料(合計)', right: formatCurrency(sumTogetherFee) },
        { left: '売上バック(合計)', right: formatCurrency(sumSalesBack) },
        { left: '残業代(合計)', right: formatCurrency(sumOvertime) },
        { left: '控除(合計)', right: formatCurrency(sumDeduction) },
        { left: '支給額(合計)', right: formatCurrency(sumTotalPay) },
        { left: '前払い(合計)', right: formatCurrency(sumPaid) },
      ],
      totalLabel: '総額(合計)',
      totalAmount: sumRealTotal,
    };
  };

  const handlePrintMonthlyTotals = async () => {
    if (isPrinting) return;
    if (!monthlyRows.length) {
      info('印刷', '印刷するデータがありません');
      return;
    }
    setIsPrinting(true);
    try {
      await doPrint(getPayloadForMonthlyTotals);
      success('印刷', '印刷しました');
    } catch (e: any) {
      error('印刷に失敗しました', e?.message || String(e));
    } finally {
      setIsPrinting(false);
    }
  };
  const handlePreviewMonthlyTotals = async () => {
    if (!monthlyRows.length) {
      info('印刷', '印刷するデータがありません');
      return;
    }
    try {
      await doPreview(getPayloadForMonthlyTotals);
    } catch (e: any) {
      error('プレビューに失敗しました', e?.message || String(e));
    }
  };

  const getPayloadForPayrollItemRow = async (item: PayrollItem): Promise<ReceiptPayload> => {
    const storeName = await fetchStoreName();
    const issuedAt = new Date();
    return {
      storeName,
      tableName: '給与計算',
      title: `給与明細（${item.staff.name}）`,
      issuedAt,
      lines: [
        { left: '検索条件', right: searchConditionText },
        { left: 'キャスト名', right: item.staff.name },
        { left: '基本時間', right: `${item.base_hours}h` },
        { left: '基本給', right: formatCurrency(item.base_wage_yen) },
        { left: '本指名数', right: `${item.nomination_count}件` },
        { left: '本指名料', right: formatCurrency(item.nomination_amount_yen) },
        { left: '場内指名数', right: `${(item as any).field_nomination_count || 0}件` },
        { left: '場内指名料', right: formatCurrency((item as any).field_nomination_amount_yen || 0) },
        { left: '売上バック', right: formatCurrency(Number((item as any).sales_back_yen ?? 0)) },
        { left: '残業代', right: formatCurrency(item.overtime_wage_yen) },
        { left: '控除', right: formatCurrency(item.deduction_yen) },
      ],
      totalLabel: '支給額',
      totalAmount: item.total_yen,
    };
  };

  const handlePrintPayrollItemRow = async (item: PayrollItem) => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      await doPrint(() => getPayloadForPayrollItemRow(item));
      success('印刷', '印刷しました');
    } catch (e: any) {
      error('印刷に失敗しました', e?.message || String(e));
    } finally {
      setIsPrinting(false);
    }
  };
  const handlePreviewPayrollItemRow = async (item: PayrollItem) => {
    try {
      await doPreview(() => getPayloadForPayrollItemRow(item));
    } catch (e: any) {
      error('プレビューに失敗しました', e?.message || String(e));
    }
  };

  useEffect(() => {
    const year = selectedYear;
    const month = selectedMonth;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    if (dateMode === 'month') {
    setPeriodStart(start);
    setPeriodEnd(end);
    }
  }, [selectedYear, selectedMonth, dateMode]);

  useEffect(() => {
    if (dateMode === 'date') {
      setPeriodStart(singleDate);
      setPeriodEnd(singleDate);
    }
  }, [dateMode, singleDate]);

  useEffect(() => {
    // 既存の給与計算があるかチェック
    const existingRun = mockPayrollRuns.find(
      run => run.period_start === periodStart && run.period_end === periodEnd
    );
    
    if (existingRun) {
      setPayrollRun(existingRun);
      setPayrollItems(mockPayrollItems.filter(item => item.payroll_run_id === existingRun.id));
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    fetchMonthlyRows(selectedYear, selectedMonth, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, dateMode, periodStart, periodEnd, singleDate]);

  const calculatePayroll = async () => {
    setIsCalculating(true);
    
    try {
      // 給与計算処理のモック
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // モックデータを使用
      setPayrollRun(mockPayrollRuns[0]);
      setPayrollItems(mockPayrollItems);
      
      console.log('給与計算完了');
      
    } catch (err) {
      error(
        '給与計算に失敗しました',
        'システムエラーが発生しました。ネットワーク接続を確認してから再度お試しください。'
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const confirmPayroll = async () => {
    if (!payrollRun) return;
    
    setIsConfirming(true);
    
    try {
      // 給与確定処理のモック
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('給与確定完了:', payrollRun.id);
      success(
        '給与が確定されました',
        `${payrollRun.period_start}〜${payrollRun.period_end}の給与計算が確定しました。従業員への支払い処理に進んでください。`
      );
      
      // ステータス更新
      setPayrollRun({...payrollRun, status: 'confirmed', confirmed_at: new Date().toISOString()});
      
    } catch (err) {
      error(
        '給与確定に失敗しました',
        'データベースエラーが発生しました。しばらく経ってから再度お試しください。'
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const startEdit = (item: PayrollItem) => {
    setEditingItem(item);
    setEditValues({
      base_hours: item.base_hours,
      nomination_count: item.nomination_count,
      field_nomination_count: (item as any).field_nomination_count || 0,
      sales_back_yen: (item as any).sales_back_yen ?? 0,
      overtime_wage_yen: item.overtime_wage_yen,
      deduction_yen: item.deduction_yen
    });
  };

  const saveEdit = () => {
    if (!editingItem) return;
    
    // 基本給を再計算（時給 × 時間）
    const baseWage = editingItem.staff.hourly_wage_yen * editValues.base_hours;
    
    // 指名料を再計算（1件あたりの金額 × 件数）
    const nominationAmount = editValues.nomination_count * 15000; // 1件15,000円と仮定
    
    // 総支給額を再計算
    const total = baseWage + nominationAmount + editValues.sales_back_yen + editValues.overtime_wage_yen - editValues.deduction_yen;
    
    const updatedItem: PayrollItem = {
      ...editingItem,
      base_hours: editValues.base_hours,
      base_wage_yen: baseWage,
      nomination_count: editValues.nomination_count,
      nomination_amount_yen: nominationAmount,
      sales_back_yen: editValues.sales_back_yen,
      overtime_wage_yen: editValues.overtime_wage_yen,
      deduction_yen: editValues.deduction_yen,
      total_yen: total
    };
    
    setPayrollItems(payrollItems.map(item => 
      item.id === editingItem.id ? updatedItem : item
    ));
    
    setEditingItem(null);
    success('給与明細を修正しました', '修正内容が反映されました。');
  };

  const cancelEdit = () => {
    setEditingItem(null);
  };

  const exportPayroll = () => {
    // CSV出力の処理（モック）
    info(
      'CSV出力を開始します',
      '給与明細データをCSVファイルでダウンロードします。しばらくお待ちください。',
      3000
    );
  };

  return (
    <RoleGate allowedRoles={['admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ダッシュボード</span>
                  <span className="sm:hidden">戻る</span>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">給与計算</h1>
                  <p className="text-xs sm:text-sm text-gray-500">給与プレビュー・確定・出力</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                {payrollRun && (
                  <Badge className={`${
                    payrollRun.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    payrollRun.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  } text-xs sm:text-sm`}>
                    {payrollRun.status === 'confirmed' ? '確定済' :
                     payrollRun.status === 'paid' ? '支払済' : '下書き'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* 期間選択（検索条件） */}
          <Card className="mb-4 sm:mb-6 md:mb-8 shadow-sm">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="w-full max-w-4xl mx-auto">
                <div className="flex justify-between gap-4 sm:gap-5 md:gap-6">
                  <div className="space-y-3">
                    <div className="text-sm sm:text-base font-medium text-gray-700">検索条件</div>
                    <div className="inline-flex rounded-md border border-gray-300 bg-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setDateMode('month')}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                          dateMode === 'month' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        月
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateMode('range')}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-l border-gray-300 transition-colors ${
                          dateMode === 'range' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        期間
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateMode('date')}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-l border-gray-300 transition-colors ${
                          dateMode === 'date' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        日付
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                    {dateMode === 'month' && (
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex flex-col space-y-1 sm:space-y-2">
                          <Label htmlFor="year" className="text-xs sm:text-sm">年</Label>
                          <select
                            id="year"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-20 sm:w-24 h-9 sm:h-10 px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                            disabled={payrollRun?.status === 'confirmed'}
                          >
                            {Array.from({ length: 16 }, (_, i) => {
                              const year = 2020 + i;
                              return (
                                <option key={year} value={year}>
                                  {year}年
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="flex flex-col space-y-1 sm:space-y-2">
                          <Label htmlFor="month" className="text-xs sm:text-sm">月</Label>
                          <select
                            id="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="w-20 sm:w-24 h-9 sm:h-10 px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                            disabled={payrollRun?.status === 'confirmed'}
                          >
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}月</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {dateMode === 'range' && (
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                        <div className="space-y-1 sm:space-y-2 flex-1 sm:flex-none">
                          <Label htmlFor="range-start" className="text-xs sm:text-sm">開始日</Label>
                          <Input
                            id="range-start"
                            type="date"
                            value={periodStart}
                            onChange={(e) => setPeriodStart(e.target.value)}
                            className="w-full sm:w-44 h-9 sm:h-10 text-sm sm:text-base"
                          />
                        </div>
                        <div className="space-y-1 sm:space-y-2 flex-1 sm:flex-none">
                          <Label htmlFor="range-end" className="text-xs sm:text-sm">終了日</Label>
                          <Input
                            id="range-end"
                            type="date"
                            value={periodEnd}
                            onChange={(e) => setPeriodEnd(e.target.value)}
                            className="w-full sm:w-44 h-9 sm:h-10 text-sm sm:text-base"
                          />
                        </div>
                      </div>
                    )}

                    {dateMode === 'date' && (
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="single-date" className="text-xs sm:text-sm">日付</Label>
                        <Input
                          id="single-date"
                          type="date"
                          value={singleDate}
                          onChange={(e) => setSingleDate(e.target.value)}
                          className="w-full sm:w-44 h-9 sm:h-10 text-sm sm:text-base"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {/* <Button 
                  onClick={calculatePayroll}
                  disabled={isCalculating || payrollRun?.status === 'confirmed'}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto"
                >
                  {isCalculating ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      計算中...
                    </div>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      給与計算
                    </>
                  )}
                </Button> */}
              </div>
            </CardContent>
          </Card>
          {/* 統計カード */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <Card className="bg-blue-50 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-blue-700 font-medium mb-1">総支給額</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 truncate">
                      {formatCurrency(castTotals.sumPay)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-green-700 font-medium mb-1">対象スタッフ</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900">
                      {castTotals.staffCount}名
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-purple-700 font-medium mb-1">総労働時間</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900">
                      {castTotals.sumHours.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-orange-700 font-medium mb-1">総指名数</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-900">
                      {castTotals.sumNominations}件
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        {/* キャスト別給与計算表 */}
        <Card className="mb-4 sm:mb-6 md:mb-8 shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <CardTitle className="text-lg sm:text-xl md:text-2xl">キャスト別 給与計算</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="キャスト名で検索..."
                    value={castSearchQuery}
                    onChange={(e) => setCastSearchQuery(e.target.value)}
                    className="pl-10 h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintMonthlyAll}
                    disabled={isPrinting}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <PrinterIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">印刷</span>
                    <span className="sm:hidden">印刷</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewMonthlyAll}
                    className="h-9 sm:h-10 px-2"
                    title="プレビュー"
                  >
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCsv}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    Object.values(autoSaveTimers.current).forEach((t) => clearTimeout(t as any));
                    autoSaveTimers.current = {};
                    await fetchMonthlyRows(selectedYear, selectedMonth, true);
                  }}
                  disabled={dateMode !== 'month'}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">初期値に戻す</span>
                  <span className="sm:hidden">リセット</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-4 md:p-6">
            {/* テーブル表示（全画面サイズで水平スクロール） */}
            <div className="w-full max-w-full overflow-x-auto">
              <div className="inline-block align-middle">
                <table className="text-xs sm:text-sm divide-y divide-gray-200" style={{ minWidth: 'max-content' }}>
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="p-2 sm:p-3 font-semibold sticky left-0 bg-gray-50 z-20 min-w-[100px] sm:min-w-[120px] border-r border-gray-200">キャスト</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">基本時間</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">基本給</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">本指名数</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">本指名料</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">場内指名数</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">場内指名料</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[60px] sm:min-w-[70px]">同伴者</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">同伴料</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[80px] sm:min-w-[100px]">売上バック</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[80px] sm:min-w-[100px]">残業代</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[80px] sm:min-w-[100px]">控除</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[80px] sm:min-w-[100px]">支給額</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sm:min-w-[110px]">前払い</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sm:min-w-[110px]  right-[80px] bg-gray-50 z-20 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">総額</th>
                    <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px] sticky right-0 bg-gray-50 z-20 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">印刷</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows
                    .filter((row) => {
                      if (!castSearchQuery) return true;
                      return row.name?.toLowerCase().includes(castSearchQuery.toLowerCase());
                    })
                    .map((row, idx) => {
                    const updateField = (key: string, value: number) => {
                      const rows = [...monthlyRows];
                      const next = { ...rows[idx], [key]: value };
                      // 再計算
                      const base_pay = Number(next.basic_hours || 0) * Number(next.hourly_price || 0);
                      const total =
                        base_pay +
                        Number(next.main_nomination_fee || 0) +
                        Number(next.inside_nomination_fee || 0) +
                        Number(next.together_nomination_fee || 0) +
                        Number(next.sales_back_yen || 0) +
                        Number(next.overtime_wage_yen || 0) -
                        Number(next.deduction_yen || 0);
                      next.base_pay = base_pay;
                      next.total_pay_yen = total;
                      const paid = Number(next.paid_price || 0);
                      next.realTotal_price = total - paid;
                      rows[idx] = next;
                      setMonthlyRows(rows);
                      if (dateMode === 'month') {
                      scheduleAutoSave(next);
                      }
                    };
                    const isUnlocked = dateMode === 'month' ? !!rowUnlocked[row.user_id] : false;
                    return (
                      <React.Fragment key={row.user_id}>
                        <tr className="border-t hover:bg-gray-50 transition-colors">
                        <td className="p-2 sm:p-3 whitespace-nowrap sticky left-0 bg-white z-20 border-r border-gray-200">
                          <div className="flex flex-col items-start space-y-1">
                            <div className="font-medium text-sm">{row.name}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {dateMode === 'month' && (
                                <button
                                  type="button"
                                  className={`inline-flex items-center text-xs px-2 py-1 rounded border transition-colors ${
                                    isUnlocked 
                                      ? 'text-green-700 border-green-300 bg-green-50 hover:bg-green-100' 
                                      : 'text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100'
                                  }`}
                                  onClick={() => toggleRowLock(row.user_id)}
                                  title={isUnlocked ? 'ロック（編集不可）' : 'ロック解除（編集可）'}
                                >
                                  {isUnlocked ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                                </button>
                              )}
                              <button
                                type="button"
                                className="inline-flex items-center text-xs px-2 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                                onClick={() => toggleDailyRows(row.user_id)}
                                title={expandedDailyRows[row.user_id] ? '日別内訳を非表示' : '日別内訳を表示'}
                              >
                                {expandedDailyRows[row.user_id] ? (
                                  <>
                                    <ChevronUp className="w-3 h-3 mr-1" />
                                    日別内訳
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3 mr-1" />
                                    日別内訳
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-700">{formatHours(row.basic_hours)}</div>
                        </td>
                        <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(row.base_pay || 0)}</td>
                        <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                          {Number(row.main_nomination_count || 0)}
                        </td>
                        <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(row.main_nomination_fee || 0)}</td>
                        <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                          {Number(row.inside_nomination_count || 0)}
                        </td>
                        <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(row.inside_nomination_fee || 0)}</td>
                        <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                          {Number(row.together_nomination_count || 0)}
                        </td>
                        <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(row.together_nomination_fee || 0)}</td>
                        <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                          <Input 
                            type="text" 
                            value={row.sales_back_yen ?? 0}
                            className="px-1.5 py-1 text-center h-8 sm:h-9 text-xs sm:text-sm w-full min-w-[70px] sm:min-w-[90px]"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            onChange={(e) => { 
                              if (!isUnlocked) return; 
                              updateField('sales_back_yen', Number((e.target.value || '').replace(',', '.'))); 
                              ensureAutoRelock(row.user_id); 
                            }}
                            disabled={!isUnlocked}
                          />
                        </td>
                        <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                          <Input 
                            type="text" 
                            value={row.overtime_wage_yen ?? 0}
                            className="px-1.5 py-1 text-center h-8 sm:h-9 text-xs sm:text-sm w-full min-w-[70px] sm:min-w-[90px]"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            onChange={(e) => { 
                              if (!isUnlocked) return; 
                              updateField('overtime_wage_yen', Number((e.target.value || '').replace(',', '.'))); 
                              ensureAutoRelock(row.user_id); 
                            }}
                            disabled={!isUnlocked}
                          />
                        </td>
                        <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-red-600 text-xs">-</span>
                            <Input
                              type="text"
                              className="text-red-600 px-1.5 py-1 text-center h-8 sm:h-9 text-xs sm:text-sm w-full min-w-[70px] sm:min-w-[90px]"
                              value={row.deduction_yen ?? 0}
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              onChange={(e) => { 
                                if (!isUnlocked) return; 
                                updateField('deduction_yen', Number((e.target.value || '').replace(',', '.'))); 
                                ensureAutoRelock(row.user_id); 
                              }}
                              disabled={!isUnlocked}
                            />
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">
                          {formatCurrency(
                            Number(row.base_pay || 0) +
                            Number(row.main_nomination_fee || 0) +
                            Number(row.inside_nomination_fee || 0) +
                            Number(row.together_nomination_fee || 0) +
                            Number(row.sales_back_yen || 0) +
                            Number(row.overtime_wage_yen || 0) -
                            Number(row.deduction_yen || 0)
                          )}
                        </td>
                        <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                          <Input
                            type="text"
                            value={row.paid_price ?? 0}
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            onChange={(e) => { 
                              if (!isUnlocked) return; 
                              updateField('paid_price', Number((e.target.value || '').replace(',', '.'))); 
                              ensureAutoRelock(row.user_id); 
                            }}
                            className="px-1.5 py-1 text-center h-8 sm:h-9 text-xs sm:text-sm w-full min-w-[80px] sm:min-w-[100px]"
                            disabled={!isUnlocked}
                          />
                        </td>
                        <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap  right-[80px] bg-white z-20 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] hover:bg-gray-50">
                          {formatCurrency(
                            (Number(row.base_pay || 0) +
                              Number(row.main_nomination_fee || 0) +
                              Number(row.inside_nomination_fee || 0) +
                              Number(row.together_nomination_fee || 0) +
                              Number(row.sales_back_yen || 0) +
                              Number(row.overtime_wage_yen || 0) -
                              Number(row.deduction_yen || 0)) -
                              Number(row.paid_price || 0)
                          )}
                        </td>
                        <td className="p-2 sm:p-3 text-center whitespace-nowrap sticky right-0 bg-white z-20 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] hover:bg-gray-50">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintMonthlyRow(row)}
                              disabled={isPrinting}
                              className="h-8 sm:h-9 text-xs px-2 sm:px-3"
                            >
                              <PrinterIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden xl:inline ml-1">印刷</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewMonthlyRow(row)}
                              className="h-8 sm:h-9 px-2"
                              title="プレビュー"
                            >
                              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </td>
                        {/* <td className="p-2">
                          <Button size="sm" variant="outline" onClick={saveRow}>保存</Button>
                        </td> */}
                      </tr>
                      {expandedDailyRows[row.user_id] && dailyRowsData[row.user_id] && (
                        <tr key={`daily-${row.user_id}`}>
                          <td colSpan={16} className="p-0 bg-gray-50">
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2 gap-4">
                                <div className="text-sm font-semibold min-w-0">日別内訳: {row.name}</div>
                                <div className="flex-shrink-0 sticky right-3 pl-4 bg-gray-50 z-30 flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePrintDailyBreakdown(row)}
                                    disabled={isPrinting}
                                    className="h-8 text-xs bg-white shadow-sm"
                                  >
                                    <PrinterIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    印刷
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreviewDailyBreakdown(row)}
                                    className="h-8 px-2"
                                    title="プレビュー"
                                  >
                                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="w-full max-w-full overflow-x-auto">
                                <div className="inline-block align-middle">
                                  <table className="text-xs sm:text-sm divide-y divide-gray-200" style={{ minWidth: 'max-content' }}>
                                    <thead className="bg-gray-50">
                                      <tr className="text-left text-gray-600">
                                        <th className="p-2 sm:p-3 font-semibold sticky left-0 bg-gray-50 z-20 min-w-[113px] sm:min-w-[133px] border-r border-gray-200">日付</th>
                                        <th className="p-2 sm:p-6 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">基本時間</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">基本給</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">本指名数</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">本指名料</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">場内指名数</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">場内指名料</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[60px] sm:min-w-[70px]">同伴者</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[70px] sm:min-w-[80px]">同伴料</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[180px] sm:min-w-[230px]">売上バック</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[180px] sm:min-w-[230px]">残業代</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[190px] sm:min-w-[240px]">控除</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[80px] sm:min-w-[100px]">支給額</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[180px] sm:min-w-[230px]">前払い</th>
                                        <th className="p-2 sm:p-3 text-center font-semibold whitespace-nowrap min-w-[90px] sm:min-w-[110px]">総額</th>
                                      </tr>
                                    </thead>
                                  <tbody>
                                    {dailyRowsData[row.user_id].map((dailyRow: any, dailyIdx: number) => {
                                      const dailyTotalPay = 
                                        Number(dailyRow.base_pay || 0) +
                                        Number(dailyRow.main_nomination_fee || 0) +
                                        Number(dailyRow.inside_nomination_fee || 0) +
                                        Number(dailyRow.together_nomination_fee || 0) +
                                        Number(dailyRow.sales_back_yen || 0) +
                                        Number(dailyRow.overtime_wage_yen || 0) -
                                        Number(dailyRow.deduction_yen || 0);
                                      const dailyPaid = Number(dailyRow.paid_price || 0);
                                      const dailyRealTotal = dailyTotalPay - dailyPaid;
                                      return (
                                        <tr key={dailyIdx} className="border-t hover:bg-gray-50 transition-colors">
                                          <td className="p-2 sm:p-3 whitespace-nowrap sticky left-0 bg-white z-20 border-r border-gray-200">
                                            <div className="font-medium text-sm">{formatDisplayDate(dailyRow.date)}</div>
                                          </td>
                                          <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                                            <div className="text-xs sm:text-sm text-gray-700">{formatHours(dailyRow.basic_hours)}</div>
                                          </td>
                                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(dailyRow.base_pay || 0)}</td>
                                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{Number(dailyRow.main_nomination_count || 0)}</td>
                                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(dailyRow.main_nomination_fee || 0)}</td>
                                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{Number(dailyRow.inside_nomination_count || 0)}</td>
                                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(dailyRow.inside_nomination_fee || 0)}</td>
                                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{Number(dailyRow.together_nomination_count || 0)}</td>
                                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">{formatCurrency(dailyRow.together_nomination_fee || 0)}</td>
                                          <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                                            <div className="text-xs sm:text-sm">{formatCurrency(dailyRow.sales_back_yen || 0)}</div>
                                          </td>
                                          <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                                            <div className="text-xs sm:text-sm">{formatCurrency(dailyRow.overtime_wage_yen || 0)}</div>
                                          </td>
                                          <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                                            <div className="text-xs sm:text-sm">{formatCurrency(dailyRow.deduction_yen || 0)}</div>
                                          </td>
                                          <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">{formatCurrency(dailyTotalPay)}</td>
                                          <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                                            <div className="text-xs sm:text-sm">{formatCurrency(dailyPaid)}</div>
                                          </td>
                                          <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">{formatCurrency(dailyRealTotal)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-gray-50 sticky bottom-0">
                                    <tr className="border-t-2 border-gray-300 font-semibold">
                                      <td className="p-2 sm:p-3 sticky left-0 bg-gray-50 z-20 border-r border-gray-200">合計</td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatHours(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.basic_hours || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.base_pay || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.main_nomination_count || 0), 0)}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.main_nomination_fee || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.inside_nomination_count || 0), 0)}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.inside_nomination_fee || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.together_nomination_count || 0), 0)}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.together_nomination_fee || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.sales_back_yen || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.overtime_wage_yen || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm text-red-600 whitespace-nowrap">
                                        -{formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.deduction_yen || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => (
                                            sum +
                                            Number(r.base_pay || 0) +
                                            Number(r.main_nomination_fee || 0) +
                                            Number(r.inside_nomination_fee || 0) +
                                            Number(r.together_nomination_fee || 0) +
                                            Number(r.sales_back_yen || 0) +
                                            Number(r.overtime_wage_yen || 0) -
                                            Number(r.deduction_yen || 0)
                                          ), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => sum + Number(r.paid_price || 0), 0)
                                        )}
                                      </td>
                                      <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">
                                        {formatCurrency(
                                          dailyRowsData[row.user_id].reduce((sum: number, r: any) => {
                                            const totalPay = 
                                              Number(r.base_pay || 0) +
                                              Number(r.main_nomination_fee || 0) +
                                              Number(r.inside_nomination_fee || 0) +
                                              Number(r.together_nomination_fee || 0) +
                                              Number(r.sales_back_yen || 0) +
                                              Number(r.overtime_wage_yen || 0) -
                                              Number(r.deduction_yen || 0);
                                            const paid = Number(r.paid_price || 0);
                                            return sum + (totalPay - paid);
                                          }, 0)
                                        )}
                                      </td>
                                    </tr>
                                  </tfoot>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 sticky bottom-0">
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="p-2 sm:p-3 sticky left-0 bg-gray-50 z-20 border-r border-gray-200">合計</td>
                    {/* <td className="p-2" /> */}
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatHours(monthlyRows.reduce((sum, r) => sum + Number(r.basic_hours || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.base_pay || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {monthlyRows.reduce((sum, r) => sum + Number(r.main_nomination_count || 0), 0)}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.main_nomination_fee || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {monthlyRows.reduce((sum, r) => sum + Number(r.inside_nomination_count || 0), 0)}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.inside_nomination_fee || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {monthlyRows.reduce((sum, r) => sum + Number(r.together_nomination_count || 0), 0)}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.together_nomination_fee || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.sales_back_yen || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.overtime_wage_yen || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm text-red-600 whitespace-nowrap">
                      -{formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.deduction_yen || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(
                        monthlyRows.reduce((sum, r) => (
                          sum +
                          Number(r.base_pay || 0) +
                          Number(r.main_nomination_fee || 0) +
                          Number(r.inside_nomination_fee || 0) +
                          Number(r.together_nomination_fee || 0) +
                          Number(r.sales_back_yen || 0) +
                          Number(r.overtime_wage_yen || 0) -
                          Number(r.deduction_yen || 0)
                        ), 0)
                      )}
                    </td>
                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(monthlyRows.reduce((sum, r) => sum + Number(r.paid_price || 0), 0))}
                    </td>
                    <td className="p-2 sm:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap right-[80px] bg-gray-50 z-20 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      {formatCurrency(
                        monthlyRows.reduce((sum, r) => (
                          sum +
                          (Number(r.base_pay || 0) +
                            Number(r.main_nomination_fee || 0) +
                            Number(r.inside_nomination_fee || 0) +
                            Number(r.together_nomination_fee || 0) +
                            Number(r.sales_back_yen || 0) +
                            Number(r.overtime_wage_yen || 0) -
                            Number(r.deduction_yen || 0)) -
                            Number(r.paid_price || 0)
                        ), 0)
                      )}
                    </td>
                    <td className="p-2 sm:p-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 z-20 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePrintMonthlyTotals}
                          disabled={isPrinting}
                          className="h-8 sm:h-9 text-xs px-2 sm:px-3"
                        >
                          <PrinterIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xl:inline ml-1">印刷</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePreviewMonthlyTotals}
                          className="h-8 sm:h-9 px-2"
                          title="プレビュー"
                        >
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tfoot>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
          {payrollItems.length > 0 && (
            <>
              {/* サマリー */}
              {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700">総支給額</p>
                        <p className="text-xl font-bold text-blue-900">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-green-700">対象スタッフ</p>
                        <p className="text-xl font-bold text-green-900">
                          {payrollItems.length}名
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-700">総労働時間</p>
                        <p className="text-xl font-bold text-purple-900">
                          {totalHours.toFixed(1)}h
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-700">総指名数</p>
                        <p className="text-xl font-bold text-orange-900">
                          {totalNominations}件
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div> */}

              {/* 給与明細一覧 */}
              {/* <Card className="mb-8">
                <CardHeader>
                  <CardTitle>給与明細一覧</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-center p-3">スタッフ名</th>
                          <th className="text-center p-3">基本時間</th>
                          <th className="text-center p-3">基本給</th>
                          <th className="text-center p-3">本指名数</th>
                          <th className="text-center p-3">本指名料</th>
                          <th className="text-center p-3">場内指名数</th>
                          <th className="text-center p-3">場内指名料</th>
                          <th className="text-center p-3">売上バック</th>
                          <th className="text-center p-3">残業代</th>
                          <th className="text-center p-3">控除</th>
                          <th className="text-center p-3 font-bold">支給額</th>
                          <th className="text-center p-3">印刷</th>
                          <th className="text-center p-3">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollItems.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{item.staff.name}</td>
                            <td className="p-3 text-center">
                              {editingItem?.id === item.id ? (
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={editValues.base_hours}
                                  onChange={(e) => setEditValues({...editValues, base_hours: Number(e.target.value)})}
                                  className="w-20 text-center"
                                />
                              ) : (
                                `${item.base_hours}h`
                              )}
                            </td>
                            <td className="p-3 text-center">{formatCurrency(item.base_wage_yen)}</td>
                            <td className="p-3 text-center">
                              {editingItem?.id === item.id ? (
                                <Input
                                  type="number"
                                  value={editValues.nomination_count}
                                  onChange={(e) => setEditValues({...editValues, nomination_count: Number(e.target.value)})}
                                  className="w-16 text-center"
                                />
                              ) : (
                                `${item.nomination_count}件`
                              )}
                            </td>
                            <td className="p-3 text-center">{formatCurrency(item.nomination_amount_yen)}</td>
                            <td className="p-3 text-center">
                              {editingItem?.id === item.id ? (
                                <Input
                                  type="number"
                                  value={editValues.field_nomination_count || 0}
                                  onChange={(e) => setEditValues({...editValues, field_nomination_count: Number(e.target.value)})}
                                  className="w-16 text-center"
                                />
                              ) : (
                                `${(item as any).field_nomination_count || 0}件`
                              )}
                            </td>
                            <td className="p-3 text-center">{formatCurrency((item as any).field_nomination_amount_yen || 0)}</td>
                            <td className="p-3 text-center">
                              {editingItem?.id === item.id ? (
                                <Input
                                  type="number"
                                  value={editValues.sales_back_yen}
                                  onChange={(e) => setEditValues({...editValues, sales_back_yen: Number(e.target.value)})}
                                  className="w-24 text-center"
                                />
                              ) : (
                                formatCurrency((item as any).sales_back_yen ?? 0)
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {editingItem?.id === item.id ? (
                                <Input
                                  type="number"
                                  value={editValues.overtime_wage_yen}
                                  onChange={(e) => setEditValues({...editValues, overtime_wage_yen: Number(e.target.value)})}
                                  className="w-24 text-center"
                                />
                              ) : (
                                formatCurrency(item.overtime_wage_yen)
                              )}
                            </td>
                            <td className="p-3 text-center text-red-600">
                              {editingItem?.id === item.id ? (
                                <Input
                                  type="number"
                                  value={editValues.deduction_yen}
                                  onChange={(e) => setEditValues({...editValues, deduction_yen: Number(e.target.value)})}
                                  className="w-24 text-center"
                                />
                              ) : (
                                item.deduction_yen > 0 ? `-${formatCurrency(item.deduction_yen)}` : '-'
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-purple-600">
                              {formatCurrency(item.total_yen)}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintPayrollItemRow(item)}
                                  disabled={isPrinting}
                                >
                                  <PrinterIcon className="w-4 h-4 mr-1" />
                                  印刷
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePreviewPayrollItemRow(item)}
                                  className="px-2"
                                  title="プレビュー"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="p-3">
                              {editingItem?.id === item.id ? (
                                <div className="flex space-x-2">
                                  <Button size="sm" onClick={saveEdit}>
                                    保存
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                                    キャンセル
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => startEdit(item)}
                                  disabled={payrollRun?.status === 'confirmed'}
                                >
                                  修正
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold">
                          <td className="p-3">合計</td>
                          <td className="p-3 text-center">{totalHours.toFixed(1)}h</td>
                          <td className="p-3 text-center">
                            {formatCurrency(payrollItems.reduce((sum, item) => sum + item.base_wage_yen, 0))}
                          </td>
                          <td className="p-3 text-center">{totalNominations}件</td>
                          <td className="p-3 text-center">
                            {formatCurrency(payrollItems.reduce((sum, item) => sum + item.nomination_amount_yen, 0))}
                          </td>
                          <td className="p-3 text-center">
                            {payrollItems.reduce((sum, item) => sum + ((item as any).field_nomination_count || 0), 0)}件
                          </td>
                          <td className="p-3 text-center">
                            {formatCurrency(payrollItems.reduce((sum, item) => sum + ((item as any).field_nomination_amount_yen || 0), 0))}
                          </td>
                          <td className="p-3 text-center">
                            {formatCurrency(payrollItems.reduce((sum, item) => sum + Number((item as any).sales_back_yen ?? 0), 0))}
                          </td>
                          <td className="p-3 text-center">
                            {formatCurrency(payrollItems.reduce((sum, item) => sum + item.overtime_wage_yen, 0))}
                          </td>
                          <td className="p-3 text-center text-red-600">
                            -{formatCurrency(payrollItems.reduce((sum, item) => sum + item.deduction_yen, 0))}
                          </td>
                          <td className="p-3 text-center text-xl text-purple-600">
                            {formatCurrency(totalAmount)}
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card> */}

              {/* アクションボタン */}
              {/* <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline"
                  onClick={exportPayroll}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV出力
                </Button>
                
                {payrollRun?.status === 'draft' && (
                  <Button 
                    onClick={confirmPayroll}
                    disabled={isConfirming}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  >
                    {isConfirming ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        確定中...
                      </div>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        給与確定
                      </>
                    )}
                  </Button>
                )}
              </div> */}

              {payrollRun?.status === 'confirmed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <div className="flex items-center text-green-800">
                    <Lock className="w-5 h-5 mr-2" />
                    <span className="font-medium">
                      この給与は確定済みです（確定日: {payrollRun.confirmed_at ? formatDate(payrollRun.confirmed_at) : ''}）
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* {payrollItems.length === 0 && !isCalculating && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">給与データがありません</h3>
              <p className="text-gray-500 mb-6">期間を選択して給与計算を実行してください</p>
            </div>
          )} */}
        </div>
      </div>

    </RoleGate>
  );
}