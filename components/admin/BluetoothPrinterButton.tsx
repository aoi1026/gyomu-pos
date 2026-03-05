'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bluetooth, Printer, RefreshCw, PlugZap, Unplug, CheckCircle2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePrinter } from '@/lib/printer-context';
import { useNotificationContext } from '@/lib/notification-context';

function detectIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}

export default function BluetoothPrinterButton() {
  const printer = usePrinter();
  const { success, error } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);

  const isIOS = useMemo(() => detectIsIOS(), []);

  const webBluetoothSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const bt = (navigator as any)?.bluetooth;
    return !!bt && typeof bt.requestDevice === 'function';
  }, []);

  const runTestPrint = () => {
    try {
      const now = new Date();
      const issued = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const testHtml = `<!doctype html><html><head><meta charset="utf-8"/><title>テスト印刷</title>
<style>@page{size:80mm auto;margin:0}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.paper{width:72mm;padding:4mm}.center{text-align:center}.small{font-size:12px;color:#111}
.line{border-top:1px solid #000;margin:8px 0}.bold{font-weight:bold;font-size:14px}</style></head>
<body><div class="paper">
<div class="center bold">EPSON TM-m30 テスト印刷</div>
<div class="line"></div>
<div class="center small">印刷が正常に動作しています</div>
<div class="line"></div>
<div class="small">発行日時: ${issued}</div>
<div class="small">プリンター: EPSON TM-m30</div>
<div class="line"></div>
<div class="center small">このテストページが正常に印刷されれば<br/>全ての印刷機能が利用可能です</div>
</div></body></html>`;

      if (isIOS) {
        const FRAME_ID = 'pos-test-print-frame';
        let iframe = document.getElementById(FRAME_ID) as HTMLIFrameElement | null;
        if (iframe) iframe.remove();
        iframe = document.createElement('iframe');
        iframe.id = FRAME_ID;
        Object.assign(iframe.style, {
          position: 'fixed', right: '0', bottom: '0',
          width: '0', height: '0', border: 'none', opacity: '0', pointerEvents: 'none',
        });
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) throw new Error('印刷フレームにアクセスできません');
        doc.open();
        doc.write(testHtml);
        doc.close();
        setTimeout(() => {
          iframe!.contentWindow?.focus();
          iframe!.contentWindow?.print();
        }, 300);
      } else {
        const w = window.open('', 'pos_os_print', 'width=420,height=400');
        if (!w) {
          error('エラー', 'ポップアップがブロックされました');
          return;
        }
        w.document.open();
        w.document.write(testHtml + `<script>setTimeout(function(){window.print()},150)<\/script>`);
        w.document.close();
      }
      success('テスト印刷', '印刷ダイアログを表示しました');
    } catch (e: any) {
      error('エラー', e?.message || '印刷ダイアログを開けませんでした');
    }
  };

  const runBluetoothTestPrint = async () => {
    if (printer.status !== 'connected') return;
    try {
      setIsBusy(true);
      const { buildEscPosRasterReceipt } = await import('@/lib/printing/escpos-raster');
      const payload = {
        storeName: 'テスト印刷',
        tableName: 'EPSON TM-m30',
        title: 'Bluetooth接続テスト',
        issuedAt: new Date(),
        lines: [
          { left: '状態', right: '正常' },
          { left: 'プリンター', right: printer.deviceName || 'BLE' },
          { left: '接続方式', right: 'Bluetooth ESC/POS' },
        ],
        totalLabel: '',
        totalAmount: 0,
      };
      await printer.write(buildEscPosRasterReceipt(payload));
      success('テスト印刷', 'Bluetooth経由で印刷しました');
    } catch (e: any) {
      error('印刷エラー', e?.message || 'テスト印刷に失敗しました');
    } finally {
      setIsBusy(false);
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
    if (printer.status === 'connected') return <Badge className="bg-green-600">BLE接続中</Badge>;
    if (printer.status === 'connecting') return <Badge className="bg-amber-600">接続中...</Badge>;
    if (isIOS) return <Badge variant="outline" className="border-blue-400 text-blue-600">OS印刷</Badge>;
    return <Badge variant="secondary">未接続</Badge>;
  }, [printer.status, isIOS]);

  const printMethodDescription = useMemo(() => {
    if (printer.status === 'connected') {
      return `Bluetooth ESC/POS で直接印刷（${printer.deviceName || 'BLE'}）`;
    }
    if (isIOS) {
      return 'iPadの印刷ダイアログ経由で印刷（Bluetooth対応プリンターを自動検出）';
    }
    return 'OSの印刷ダイアログ経由で印刷';
  }, [printer.status, printer.deviceName, isIOS]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs sm:text-sm"
        onClick={() => setOpen(true)}
      >
        <Printer className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">プリンター</span>
        <span className="ml-2 hidden sm:inline">{statusBadge}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              プリンター設定
            </DialogTitle>
            <DialogDescription>
              EPSON TM-m30 Bluetooth プリンター
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current print method status */}
            <div className="rounded-lg border p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className={`w-4 h-4 ${printer.status === 'connected' ? 'text-green-600' : isIOS ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">
                  現在の印刷方式
                </span>
                {statusBadge}
              </div>
              <p className="text-xs text-gray-600 ml-6">{printMethodDescription}</p>
            </div>

            {/* iPad / iOS - OS print path */}
            {isIOS && (
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">iPad Bluetooth印刷</p>
                      <p>iPadの設定アプリでEPSON TM-m30とBluetoothペアリング済みの場合、印刷ボタンをタップすると自動的にiPadの印刷ダイアログが表示され、ペアリング済みプリンターで印刷できます。</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>テスト印刷</Label>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={runTestPrint}
                    disabled={isBusy}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    テスト印刷を実行
                  </Button>
                  <p className="text-xs text-gray-500">
                    iPadの印刷ダイアログが表示されます。EPSON TM-m30を選択して印刷してください。
                  </p>
                </div>
              </div>
            )}

            {/* Web Bluetooth (Chrome/Edge) */}
            {webBluetoothSupported && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">
                      Bluetooth状態: {printer.status === 'connected' ? '接続中' : printer.status === 'connecting' ? '接続中...' : '未接続'}
                    </div>
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

                {printer.status === 'connected' && (
                  <div className="space-y-2">
                    <Label>Bluetooth テスト印刷</Label>
                    <Button className="w-full" variant="outline" onClick={runBluetoothTestPrint} disabled={isBusy}>
                      <Printer className="w-4 h-4 mr-2" />
                      ESC/POS テスト印刷
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* OS print fallback for non-iOS, non-WebBluetooth */}
            {!webBluetoothSupported && !isIOS && (
              <div className="space-y-2">
                <Label>OSの印刷機能</Label>
                <Button className="w-full" variant="outline" onClick={runTestPrint} disabled={isBusy}>
                  <Printer className="w-4 h-4 mr-2" />
                  テスト印刷（OSの印刷ダイアログ）
                </Button>
                <p className="text-xs text-gray-500">
                  このブラウザはWeb Bluetoothに対応していません。OSの印刷ダイアログからプリンターを選択してください。
                </p>
              </div>
            )}

            {/* General OS print fallback (always available as alternative) */}
            {webBluetoothSupported && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-gray-500">代替: OSの印刷ダイアログ</Label>
                <Button className="w-full" variant="ghost" size="sm" onClick={runTestPrint} disabled={isBusy}>
                  <Printer className="w-4 h-4 mr-2" />
                  OS印刷でテスト
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
