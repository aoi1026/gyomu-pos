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

  useEffect(() => {
    if (!open) return;
    setSelectedId(printer.deviceId || '');
    printer.refreshPairedDevices().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const statusBadge = useMemo(() => {
    if (printer.status === 'connected') return <Badge className="bg-green-600">接続中</Badge>;
    if (printer.status === 'connecting') return <Badge className="bg-amber-600">接続中...</Badge>;
    return <Badge variant="secondary">未接続</Badge>;
  }, [printer.status]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs sm:text-sm"
        onClick={() => setOpen(true)}
      >
        <Printer className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">プリンター</span>
        <span className="ml-2 hidden sm:inline">{statusBadge}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bluetooth className="w-5 h-5" />
              Bluetoothプリンター接続
            </DialogTitle>
            <DialogDescription>
              ブラウザ仕様上、周辺デバイスの一覧表示は「検索（ブラウザのデバイス選択画面）」で行います。
              一度許可したデバイスは、この画面に「許可済みデバイス」として表示されます。
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
                  disabled={isBusy}
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
                  disabled={isBusy || !selectedId || selectedId === '__none'}
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
                disabled={isBusy}
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

