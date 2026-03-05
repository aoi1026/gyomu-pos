'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Printer, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

export type PendingPrintJob = {
  data: Uint8Array;
  label: string;
};

interface PrintConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingJob: PendingPrintJob | null;
  printerStatus: 'disconnected' | 'connecting' | 'connected';
  deviceName: string | null;
  pairedDevices: Array<{ id: string; name: string }>;
  onRefreshDevices: () => Promise<void>;
  onRequestConnect: () => Promise<void>;
  onConnectById: (id: string) => Promise<void>;
  onWrite: (data: Uint8Array) => Promise<void>;
  onComplete: () => void;
}

export default function PrintConfirmModal({
  open,
  onOpenChange,
  pendingJob,
  printerStatus,
  deviceName,
  pairedDevices,
  onRefreshDevices,
  onRequestConnect,
  onConnectById,
  onWrite,
  onComplete,
}: PrintConfirmModalProps) {
  const { success, error } = useNotificationContext();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

  const webBluetoothSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const bt = (navigator as any)?.bluetooth;
    return !!bt && typeof bt.requestDevice === 'function';
  }, []);

  useEffect(() => {
    if (open) {
      setIsPrinting(false);
      setIsConnecting(false);
      setConnectingDeviceId(null);
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
    try {
      await onWrite(pendingJob.data);
      success('印刷完了', `${pendingJob.label}を印刷しました`);
      onComplete();
    } catch (e: any) {
      error('印刷エラー', e?.message || '印刷に失敗しました。プリンター接続を確認してください。');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPrinting) onOpenChange(v); }}>
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
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Bluetooth className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-amber-800">プリンター未接続</div>
                  <div className="text-xs text-amber-600">
                    {webBluetoothSupported
                      ? 'デバイスを選択するか、検索して接続してください'
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

                  {/* <Button
                    className="w-full"
                    variant="outline"
                    disabled={isConnecting}
                    onClick={handleSearchAndConnect}
                  >
                    {isConnecting && !connectingDeviceId ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    {isConnecting && !connectingDeviceId ? '検索中...' : 'Bluetoothデバイスを検索'}
                  </Button> */}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPrinting}>
            キャンセル
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printerStatus !== 'connected' || isPrinting || !pendingJob}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
