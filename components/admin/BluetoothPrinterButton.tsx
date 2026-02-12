'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bluetooth, Printer, RefreshCw, PlugZap, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePrinter } from '@/lib/printer-context';
import { useNotificationContext } from '@/lib/notification-context';

export default function BluetoothPrinterButton() {
  const printer = usePrinter();
  const { success, error } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);

  const webBluetoothSupported = useMemo(() => {
    // Safari / Firefox: usually not supported.
    // Chrome / Edge: supported (secure context required).
    if (typeof window === 'undefined') return false;
    const bt = (navigator as any)?.bluetooth;
    return !!bt && typeof bt.requestDevice === 'function';
  }, []);

  const openOsPrintDialog = () => {
    try {
      const w = window.open('', 'pos_os_print', 'width=420,height=680');
      if (!w) {
        error('エラー', 'ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
        return;
      }
      const now = new Date();
      const issued = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      w.document.open();
      w.document.write(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>印刷</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .paper { width: 72mm; padding: 4mm; }
      .center { text-align: center; }
      .small { font-size: 12px; color: #111; }
      .line { border-top: 1px solid #000; margin: 8px 0; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="paper">
      <div class="center"><strong>プリンター接続テスト</strong></div>
      <div class="center small">OSの印刷ダイアログからプリンターを選択してください</div>
      <div class="line"></div>
      <div class="small">発行: ${issued}</div>
      <div class="small">ブラウザ: ${navigator.userAgent}</div>
      <div class="line"></div>
      <div class="mono">※ Safari/FirefoxではブラウザからBluetooth機器を直接検索できないため、OSの印刷機能を利用します。</div>
    </div>
    <script>
      setTimeout(() => { window.print(); }, 150);
    </script>
  </body>
</html>
      `);
      w.document.close();
    } catch (e: any) {
      error('エラー', e?.message || '印刷ダイアログを開けませんでした');
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelectedId(printer.deviceId || '');
    if (webBluetoothSupported) {
      printer.refreshPairedDevices().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const statusBadge = useMemo(() => {
    if (printer.status === 'connected') return <Badge className="bg-green-600">接続中</Badge>;
    if (printer.status === 'connecting') return <Badge className="bg-amber-600">接続中...</Badge>;
    return <Badge variant="secondary">未接続</Badge>;
  }, [printer.status]);

  return (
    <>
      {/* <Button
        variant="ghost"
        size="sm"
        className="text-xs sm:text-sm"
        onClick={() => setOpen(true)}
      >
        <Printer className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">プリンター</span>
        <span className="ml-2 hidden sm:inline">{statusBadge}</span>
      </Button> */} 

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bluetooth className="w-5 h-5" />
              Bluetoothプリンター接続
            </DialogTitle>
            <DialogDescription>
              {webBluetoothSupported ? (
                <>
                  ブラウザ仕様上、周辺デバイスの一覧表示は「検索（ブラウザのデバイス選択画面）」で行います。
                  一度許可したデバイスは、この画面に「許可済みデバイス」として表示されます。
                </>
              ) : (
                <>
                  このブラウザは Web Bluetooth に対応していないため、ブラウザからBluetooth機器を直接検索できません。
                  OSの印刷ダイアログ（プリンター一覧）を利用してください。
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">状態: {printer.status === 'connected' ? '接続中' : printer.status === 'connecting' ? '接続中...' : '未接続'}</div>
                <div className="text-gray-600">
                  {printer.deviceName ? `デバイス: ${printer.deviceName}` : 'デバイス未選択'}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy || !webBluetoothSupported}
                  onClick={async () => {
                    try {
                      setIsBusy(true);
                      await printer.refreshPairedDevices();
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  更新
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy || printer.status !== 'connected'}
                  onClick={() => {
                    printer.disconnect();
                    success('プリンター', '切断しました');
                  }}
                >
                  <Unplug className="w-4 h-4 mr-2" />
                  切断
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>許可済みデバイスから接続</Label>
              <div className="flex gap-2">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="デバイスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {printer.pairedDevices.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        （許可済みデバイスなし）
                      </SelectItem>
                    ) : (
                      printer.pairedDevices.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={isBusy || !webBluetoothSupported || !selectedId || selectedId === '__none'}
                  onClick={async () => {
                    try {
                      setIsBusy(true);
                      await printer.connectById(selectedId);
                      success('プリンター', '接続しました');
                      setOpen(false);
                    } catch (e) {
                      error('エラー', e instanceof Error ? e.message : '接続に失敗しました');
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                >
                  <PlugZap className="w-4 h-4 mr-2" />
                  接続
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>周辺のBluetoothデバイスを検索</Label>
              <Button
                className="w-full"
                disabled={isBusy || !webBluetoothSupported}
                onClick={async () => {
                  try {
                    setIsBusy(true);
                    await printer.requestAndConnect();
                    success('プリンター', '接続しました');
                    setOpen(false);
                  } catch (e) {
                    error('エラー', e instanceof Error ? e.message : '接続に失敗しました');
                  } finally {
                    setIsBusy(false);
                  }
                }}
              >
                <Bluetooth className="w-4 h-4 mr-2" />
                検索して接続（デバイス選択）
              </Button>
            </div>

            {!webBluetoothSupported && (
              <div className="space-y-2">
                <Label>Safari / Firefox 向け（OSの印刷機能）</Label>
                <Button className="w-full" variant="outline" onClick={openOsPrintDialog} disabled={isBusy}>
                  <Printer className="w-4 h-4 mr-2" />
                  OSの印刷ダイアログを開く（テスト印刷）
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

