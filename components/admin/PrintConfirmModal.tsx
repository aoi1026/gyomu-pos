'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Printer, CheckCircle2, Loader2, Search, XCircle, Smartphone, Wifi } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

function detectIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1) ||
    (/Macintosh/.test(navigator.userAgent) && typeof document !== 'undefined' && 'ontouchend' in document);
}

import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';
import {
  printReceiptViaEpos,
  printFullReceiptViaEpos,
  printReceiptsViaEpos,
} from '@/lib/printing/epos-print';

export type PendingPrintJob = {
  data: Uint8Array;
  label: string;
  /** OS印刷フォールバック（Web Bluetooth非対応時に使用） */
  osFallback?: () => void;
  /** ePOS クライアント印刷用（iPad→プリンター直接 Wi-Fi）。設定時は data の代わりに使用 */
  eposPayload?: ReceiptPayload | FullReceiptPayload | ReceiptPayload[];
};

interface PrintConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingJob: PendingPrintJob | null;
  printerStatus: 'disconnected' | 'connecting' | 'connected';
  deviceName: string | null;
  pairedDevices: Array<{ id: string; name: string }>;
  networkPrinterIp: string | null;
  onRefreshDevices: () => Promise<void>;
  onRequestConnect: () => Promise<void>;
  onConnectById: (id: string) => Promise<void>;
  onWrite: (data: Uint8Array) => Promise<void>;
  onNetworkPrint: (data: Uint8Array) => Promise<void>;
  onComplete: () => void;
}

export default function PrintConfirmModal({
  open,
  onOpenChange,
  pendingJob,
  printerStatus,
  deviceName,
  pairedDevices,
  networkPrinterIp,
  onRefreshDevices,
  onRequestConnect,
  onConnectById,
  onWrite,
  onNetworkPrint,
  onComplete,
}: PrintConfirmModalProps) {
  const { success, error } = useNotificationContext();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [printResult, setPrintResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isIOS = useMemo(() => detectIsIOS(), []);

  const webBluetoothSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const bt = (navigator as any)?.bluetooth;
    return !!bt && typeof bt.requestDevice === 'function';
  }, []);

  const hasOsFallback = !!pendingJob?.osFallback;

  useEffect(() => {
    if (open) {
      setIsPrinting(false);
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setPrintResult(null);
      if (webBluetoothSupported) {
        onRefreshDevices().catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSearchAndConnect = async () => {
    setIsConnecting(true);
    setConnectingDeviceId(null);
    try {
      await onRequestConnect();
    } catch (e: any) {
      if (e?.name !== 'NotFoundError' && e?.message !== 'User cancelled the requestDevice() chooser.') {
        error('接続エラー', e?.message || '接続に失敗しました');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectById = async (id: string) => {
    setIsConnecting(true);
    setConnectingDeviceId(id);
    try {
      await onConnectById(id);
    } catch (e: any) {
      error('接続エラー', e?.message || '接続に失敗しました');
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  const handlePrint = async () => {
    if (!pendingJob) return;
    setIsPrinting(true);
    setPrintResult(null);
    try {
      await onWrite(pendingJob.data);
      setPrintResult({ type: 'success', message: '正常に印刷されました' });
    } catch (e: any) {
      const reason = e?.message || '印刷に失敗しました。プリンター接続を確認してください。';
      setPrintResult({ type: 'error', message: reason });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOsPrint = () => {
    if (!pendingJob?.osFallback) return;
    try {
      pendingJob.osFallback();
      setPrintResult({ type: 'success', message: '印刷ダイアログを表示しました。プリンターを選択して印刷してください。' });
    } catch (e: any) {
      setPrintResult({ type: 'error', message: e?.message || '印刷ダイアログを開けませんでした' });
    }
  };

  const handleNetworkPrint = async () => {
    if (!pendingJob || !networkPrinterIp) return;
    setIsPrinting(true);
    setPrintResult(null);
    try {
      if (pendingJob.eposPayload) {
        const p = pendingJob.eposPayload;
        if (Array.isArray(p)) {
          await printReceiptsViaEpos(networkPrinterIp, p);
        } else if ('orderLines' in p) {
          await printFullReceiptViaEpos(networkPrinterIp, p);
        } else {
          await printReceiptViaEpos(networkPrinterIp, p);
        }
        setPrintResult({ type: 'success', message: '正常に印刷されました（Wi-Fi 直接接続）' });
      } else {
        await onNetworkPrint(pendingJob.data);
        setPrintResult({ type: 'success', message: 'ネットワーク経由で印刷しました' });
      }
    } catch (e: any) {
      setPrintResult({ type: 'error', message: e?.message || 'ネットワーク印刷に失敗しました' });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleClose = () => {
    if (printResult?.type === 'success') {
      onComplete();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (isPrinting) return;
      if (!v && printResult?.type === 'success') {
        onComplete();
      }
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            印刷確認
          </DialogTitle>
          {pendingJob && (
            <DialogDescription>{pendingJob.label}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {printerStatus === 'connected' ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-green-800">プリンター接続中</div>
                <div className="text-xs text-green-600 truncate">{deviceName || 'Bluetooth デバイス'}</div>
              </div>
              <Badge className="bg-green-600 flex-shrink-0">接続中</Badge>
            </div>
          ) : networkPrinterIp ? (
            /* ネットワークプリンター設定済み */
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Wifi className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-blue-800">ネットワークプリンター</div>
                <div className="text-xs text-blue-600 truncate">IP: {networkPrinterIp}</div>
              </div>
              <Badge className="bg-blue-600 flex-shrink-0">ネットワーク</Badge>
            </div>
          ) : !webBluetoothSupported && hasOsFallback ? (
            /* Web Bluetooth非対応（iPad/Safari等）: OS印刷フォールバック */
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-800">
                    {isIOS ? 'iPad印刷' : 'OS印刷'}
                  </div>
                  <div className="text-xs text-blue-600">
                    {isIOS
                      ? 'iPadの印刷ダイアログからBluetoothペアリング済みプリンターで印刷できます'
                      : 'OSの印刷ダイアログからプリンターを選択して印刷できます'}
                  </div>
                </div>
                <Badge className="bg-blue-600 flex-shrink-0">OS印刷</Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Bluetooth className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-amber-800">プリンター未接続</div>
                  <div className="text-xs text-amber-600">
                    {webBluetoothSupported
                      ? 'デバイスを選択するか、検索して接続してください'
                      : hasOsFallback
                        ? 'OS印刷ダイアログで印刷できます'
                        : 'このブラウザはWeb Bluetoothに対応していません。Chrome（デスクトップ版）をご利用ください。'}
                  </div>
                </div>
              </div>

              {webBluetoothSupported && (
                <>
                  {pairedDevices.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-gray-500 px-1">接続可能なデバイス</div>
                      {pairedDevices.map((d) => (
                        <button
                          key={d.id}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors text-left disabled:opacity-50"
                          disabled={isConnecting}
                          onClick={() => handleConnectById(d.id)}
                        >
                          <Bluetooth className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-sm flex-1 truncate">{d.name}</span>
                          {isConnecting && connectingDeviceId === d.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            <span className="text-xs text-blue-600 font-medium">接続</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {printResult && (
          <div className={`flex items-start gap-3 p-3 border ${
            printResult.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            {printResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${
                printResult.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {printResult.type === 'success' ? '印刷完了' : '印刷失敗'}
              </div>
              <div className={`text-xs mt-0.5 ${
                printResult.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {printResult.message}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {printResult ? (
            <>
              {printResult.type === 'error' && (
                <Button
                  variant="outline"
                  onClick={() => setPrintResult(null)}
                >
                  戻る
                </Button>
              )}
              <Button onClick={handleClose}>
                閉じる
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPrinting}>
                キャンセル
              </Button>
              {printerStatus === 'connected' ? (
                <Button
                  onClick={handlePrint}
                  disabled={isPrinting || !pendingJob}
                >
                  {isPrinting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      印刷中...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 mr-2" />
                      印刷する
                    </>
                  )}
                </Button>
              ) : networkPrinterIp ? (
                <Button
                  onClick={handleNetworkPrint}
                  disabled={isPrinting || !pendingJob}
                >
                  {isPrinting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      印刷中...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      ネットワーク印刷
                    </>
                  )}
                </Button>
              ) : hasOsFallback ? (
                <Button
                  onClick={handleOsPrint}
                  disabled={isPrinting || !pendingJob}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {isIOS ? 'iPad印刷で印刷する' : 'OS印刷で印刷する'}
                </Button>
              ) : (
                <Button
                  onClick={handlePrint}
                  disabled={true}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  印刷する
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
