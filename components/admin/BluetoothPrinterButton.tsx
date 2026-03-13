'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bluetooth,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlugZap,
  Printer,
  RefreshCw,
  Save,
  ShieldAlert,
  Unplug,
  Wifi,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePrinter } from '@/lib/printer-context';
import { useNotificationContext } from '@/lib/notification-context';
import { buildEscPosRasterReceipt } from '@/lib/printing/escpos-raster';
import { isValidIpv4 } from '@/lib/printing/utils';

function detectIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1) ||
    (/Macintosh/.test(navigator.userAgent) && typeof document !== 'undefined' && 'ontouchend' in document);
}

export default function BluetoothPrinterButton() {
  const printer = usePrinter();
  const { success, error } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [networkIpInput, setNetworkIpInput] = useState('');
  const [networkTestResult, setNetworkTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSavingIp, setIsSavingIp] = useState(false);
  const [isTestingIp, setIsTestingIp] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);

  const isIOS = useMemo(() => detectIsIOS(), []);

  const webBluetoothSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const bt = (navigator as any)?.bluetooth;
    return !!bt && typeof bt.requestDevice === 'function';
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedId(printer.deviceId || '');
    setNetworkIpInput(printer.networkPrinterIp || '');
    setNetworkTestResult(null);
    printer.refreshPairedDevices().catch(() => {});
  }, [open, printer.deviceId, printer.networkPrinterIp, printer.refreshPairedDevices]);

  const statusBadge = useMemo(() => {
    if (printer.networkPrinterIp) {
      return (
        <Badge className={printer.isNetworkPrinterReady ? 'bg-blue-600' : 'bg-amber-600'}>
          {printer.isNetworkPrinterReady ? 'LAN接続設定済み' : 'LAN設定済み'}
        </Badge>
      );
    }
    if (printer.status === 'connected') return <Badge className="bg-green-600">Bluetooth接続中</Badge>;
    if (printer.status === 'connecting') return <Badge className="bg-amber-600">接続中...</Badge>;
    return <Badge variant="secondary">未設定</Badge>;
  }, [printer.networkPrinterIp, printer.isNetworkPrinterReady, printer.status]);

  const buttonToneClass = useMemo(() => {
    if (printer.networkPrinterIp) return 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100';
    if (printer.status === 'connected') return 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100';
    return '';
  }, [printer.networkPrinterIp, printer.status]);

  const currentConnectionText = useMemo(() => {
    if (printer.networkPrinterIp) {
      return `メインレシートプリンターIP: ${printer.networkPrinterIp}`;
    }
    if (printer.status === 'connected') {
      return `Bluetoothプリンター: ${printer.deviceName || '接続済みデバイス'}`;
    }
    return '未接続';
  }, [printer.networkPrinterIp, printer.status, printer.deviceName]);

  const runTestPrint = async () => {
    try {
      setIsPrintingTest(true);
      setNetworkTestResult(null);
      const now = new Date();
      const payload = {
        storeName: 'LNXS',
        tableName: 'MAIN PRINTER',
        title: '接続テスト',
        issuedAt: now,
        lines: [
          { left: '接続方式', right: printer.networkPrinterIp ? 'LAN / Wi-Fi' : printer.status === 'connected' ? 'Bluetooth' : isIOS ? 'iPad' : 'OS' },
          { left: 'プリンターIP', right: printer.networkPrinterIp || '未設定' },
          { left: '状態', right: '印刷テストOK' },
        ],
        totalLabel: '確認',
        totalAmount: 0,
      };

      await printer.requestPrint(buildEscPosRasterReceipt(payload), 'メインプリンター印刷テスト', {
        eposPayload: payload,
      });
      setNetworkTestResult({ ok: true, message: '正常に印刷されました' });
    } catch (e: any) {
      setNetworkTestResult({ ok: false, message: e?.message || 'テスト印刷に失敗しました' });
    } finally {
      setIsPrintingTest(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`text-xs sm:text-sm gap-2 ${buttonToneClass}`}
        onClick={() => setOpen(true)}
      >
        <Printer className="w-4 h-4" />
        <span className="hidden md:inline">プリンター</span>
        <span className="hidden lg:inline">{statusBadge}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              レシートプリンター接続設定
            </DialogTitle>
            <DialogDescription>
              EPSON TM-m30 を LAN でルーターに接続し、iPad を同一 Wi-Fi に接続した状態で設定してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className={`w-4 h-4 ${printer.networkPrinterIp ? 'text-blue-600' : printer.status === 'connected' ? 'text-green-600' : 'text-slate-400'}`} />
                <span className="text-sm font-medium">現在の接続状態</span>
                {statusBadge}
              </div>
              <p className="text-sm text-slate-700">{currentConnectionText}</p>
              <p className="text-xs text-slate-500 mt-2">
                接続済みの状態では、本システムの印刷ボタンから確認ダイアログなしで直接送信されます。
              </p>
            </div>

            <div className="border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Wi-Fi / LAN 接続手順</span>
              </div>
              <ol className="text-sm text-blue-900 space-y-2 list-decimal pl-5">
                <li>プリンター底面の LAN ポートにケーブルを挿し、ルーターへ接続します。</li>
                <li>プリンターの電源投入後、印字されたレシートに表示される IP Address を確認します。</li>
                <li>その IP を下の「メインレシートプリンターIP」に入力して保存します。</li>
                <li>iPad は必ず同じルーターの Wi-Fi に接続してください。</li>
                <li>保存後に「接続テスト」、最後に「メインプリンター印刷テスト」を実行してください。</li>
              </ol>
            </div>

            {typeof window !== 'undefined' && window.location.protocol === 'https:' && isValidIpv4(networkIpInput) && (
              <div className="border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">HTTPS環境: SSL証明書の承認が必要</span>
                </div>
                <p className="text-xs text-amber-800 mb-3">
                  このサイトはHTTPSで動作しています。プリンターとの安全な通信（WSS）を行うため、
                  プリンターのSSL証明書を一度iPadで承認する必要があります。
                </p>
                <ol className="text-xs text-amber-800 space-y-1 list-decimal pl-5 mb-3">
                  <li>下の「証明書を承認」ボタンをタップして新しいタブを開きます</li>
                  <li>「この接続ではプライバシーが保護されません」と表示されます</li>
                  <li>「詳細を表示」→「このWebサイトを閲覧」をタップしてください</li>
                  <li>このページに戻り「接続テスト」をクリックしてください</li>
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => {
                    window.open(`https://${networkIpInput.trim()}:8043/`, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  証明書を承認（新しいタブで開く）
                </Button>
              </div>
            )}

            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                <Label className="font-medium">メインレシートプリンターIP</Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="例: 192.168.1.130"
                  value={networkIpInput}
                  onChange={(e) => {
                    setNetworkIpInput(e.target.value);
                    setNetworkTestResult(null);
                  }}
                />
                <Button
                  size="sm"
                  disabled={isSavingIp || !isValidIpv4(networkIpInput)}
                  onClick={async () => {
                    setIsSavingIp(true);
                    try {
                      await printer.saveNetworkPrinterIp(networkIpInput);
                      success('保存完了', `メインレシートプリンターIPを ${networkIpInput.trim()} に設定しました`);
                    } catch (e: any) {
                      error('保存エラー', e?.message || 'プリンターIPの保存に失敗しました');
                    } finally {
                      setIsSavingIp(false);
                    }
                  }}
                >
                  {isSavingIp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="ml-1">保存</span>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isTestingIp || !isValidIpv4(networkIpInput)}
                  onClick={async () => {
                    setIsTestingIp(true);
                    setNetworkTestResult(null);
                    try {
                      const result = await printer.testNetworkPrinter(networkIpInput);
                      setNetworkTestResult(result);
                    } catch (e: any) {
                      const message = e?.message || '接続テストに失敗しました';
                      setNetworkTestResult({ ok: false, message });
                    } finally {
                      setIsTestingIp(false);
                    }
                  }}
                >
                  {isTestingIp ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wifi className="w-4 h-4 mr-1" />}
                  接続テスト
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPrintingTest || (!printer.networkPrinterIp && printer.status !== 'connected')}
                  onClick={runTestPrint}
                >
                  {isPrintingTest ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
                  メインプリンター印刷テスト
                </Button>

                {printer.networkPrinterIp && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    disabled={isSavingIp}
                    onClick={async () => {
                      setIsSavingIp(true);
                      try {
                        await printer.clearNetworkPrinterIp();
                        setNetworkIpInput('');
                        setNetworkTestResult(null);
                        success('設定解除', 'メインレシートプリンターIPを削除しました');
                      } catch (e: any) {
                        error('設定解除失敗', e?.message || 'プリンターIP設定の削除に失敗しました');
                      } finally {
                        setIsSavingIp(false);
                      }
                    }}
                  >
                    設定解除
                  </Button>
                )}
              </div>

              {networkTestResult && (
                <div className={`flex items-start gap-2 border p-3 text-sm ${
                  networkTestResult.ok
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : 'border-red-300 bg-red-50 text-red-800'
                }`}>
                  {networkTestResult.ok ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {networkTestResult.ok ? '接続テスト成功' : '接続テスト失敗'}
                    </div>
                    <div className="text-xs mt-1 whitespace-pre-wrap break-all">
                      {networkTestResult.message}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* {webBluetoothSupported && (
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bluetooth className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Bluetooth 接続</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      LAN が使えない端末向けの補助機能です。運用は Wi-Fi / LAN を優先してください。
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      try {
                        await printer.refreshPairedDevices();
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    更新
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="許可済みBluetoothデバイスを選択" />
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
                      setIsBusy(true);
                      try {
                        await printer.connectById(selectedId);
                        success('Bluetooth接続完了', 'プリンターに接続しました');
                      } catch (e: any) {
                        error('Bluetooth接続失敗', e?.message || 'Bluetooth接続に失敗しました');
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                  >
                    <PlugZap className="w-4 h-4 mr-1" />
                    接続
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      try {
                        await printer.requestAndConnect();
                        success('Bluetooth接続完了', 'プリンターに接続しました');
                      } catch (e: any) {
                        error('Bluetooth接続失敗', e?.message || 'Bluetooth接続に失敗しました');
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                  >
                    <Bluetooth className="w-4 h-4 mr-1" />
                    検索して接続
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={printer.status !== 'connected'}
                    onClick={() => {
                      printer.disconnect();
                      success('Bluetooth切断', 'プリンター接続を解除しました');
                    }}
                  >
                    <Unplug className="w-4 h-4 mr-1" />
                    切断
                  </Button>
                </div>
              </div>
            )} */}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
