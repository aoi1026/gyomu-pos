'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  connectBluetoothEscPosPrinter,
  connectToBluetoothDevice,
  listPairedBluetoothDevices,
  writeEscPos,
} from '@/lib/printing/bluetooth-escpos';
import PrintConfirmModal from '@/components/admin/PrintConfirmModal';
import type { PendingPrintJob } from '@/components/admin/PrintConfirmModal';
import { useNotificationContext } from '@/lib/notification-context';
import { isValidIpv4 } from '@/lib/printing/utils';
import { testEposConnection } from '@/lib/printing/epos-print';
import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';

type PrinterStatus = 'disconnected' | 'connecting' | 'connected';

type PrinterContextValue = {
  status: PrinterStatus;
  deviceName: string | null;
  deviceId: string | null;
  pairedDevices: Array<{ id: string; name: string }>;
  networkPrinterIp: string | null;
  isNetworkPrinterReady: boolean;
  refreshPairedDevices: () => Promise<void>;
  refreshNetworkPrinterIp: () => Promise<void>;
  saveNetworkPrinterIp: (ip: string) => Promise<void>;
  clearNetworkPrinterIp: () => Promise<void>;
  testNetworkPrinter: (ip?: string) => Promise<{ ok: boolean; message: string }>;
  requestAndConnect: () => Promise<void>;
  connectById: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  write: (data: Uint8Array) => Promise<void>;
  networkPrint: (data: Uint8Array) => Promise<void>;
  requestPrint: (
    data: Uint8Array,
    label?: string,
    options?: { osFallback?: () => void; eposPayload?: ReceiptPayload | FullReceiptPayload | ReceiptPayload[] }
  ) => Promise<void>;
};

const PrinterContext = createContext<PrinterContextValue | null>(null);

const LS_KEY = 'bt_printer_device_id';

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PrinterStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<Array<{ id: string; name: string }>>([]);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [networkPrinterIp, setNetworkPrinterIp] = useState<string | null>(null);
  const [isNetworkPrinterReady, setIsNetworkPrinterReady] = useState(false);
  const [pendingJob, setPendingJob] = useState<PendingPrintJob | null>(null);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const { success, error } = useNotificationContext();

  const refreshPairedDevices = useCallback(async () => {
    try {
      const devices = await listPairedBluetoothDevices();
      setPairedDevices(
        devices.map((d) => ({
          id: d.id,
          name: d.name || '(no name)',
        }))
      );
    } catch {
      setPairedDevices([]);
    }
  }, []);

  const refreshNetworkPrinterIp = useCallback(async () => {
    try {
      const res = await fetch('/api/project-variables?name=printer_ip');
      const json = await res.json();
      const value = json.success && json.data?.value ? String(json.data.value).trim() : '';
      setNetworkPrinterIp(value || null);
      setIsNetworkPrinterReady(Boolean(value));
    } catch {
      setNetworkPrinterIp(null);
      setIsNetworkPrinterReady(false);
    }
  }, []);

  const saveNetworkPrinterIp = useCallback(async (ip: string) => {
    const normalizedIp = ip.trim();
    if (normalizedIp && !isValidIpv4(normalizedIp)) {
      throw new Error('無効なIPアドレス形式です');
    }
    const res = await fetch('/api/project-variables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'printer_ip',
        value: normalizedIp,
        other: 'メインレシートプリンターIP',
      }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'プリンターIPの保存に失敗しました');
    }
    setNetworkPrinterIp(normalizedIp || null);
    setIsNetworkPrinterReady(Boolean(normalizedIp));
  }, []);

  const clearNetworkPrinterIp = useCallback(async () => {
    const res = await fetch('/api/project-variables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'printer_ip',
        value: '',
      }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'プリンターIP設定の削除に失敗しました');
    }
    setNetworkPrinterIp(null);
    setIsNetworkPrinterReady(false);
  }, []);

  const testNetworkPrinter = useCallback(async (ip?: string) => {
    const targetIp = (ip || networkPrinterIp || '').trim();
    if (!targetIp) {
      throw new Error('プリンターIPが未設定です');
    }

    const result = await testEposConnection(targetIp);
    if (!result.ok) {
      throw new Error(result.message);
    }
    return { ok: true, message: result.message };
  }, [networkPrinterIp]);

  const disconnect = () => {
    try {
      device?.gatt?.disconnect();
    } catch {
      // ignore
    }
    setCharacteristic(null);
    setDevice(null);
    setStatus('disconnected');
  };

  const connectTo = async (btDevice: BluetoothDevice) => {
    setStatus('connecting');
    try {
      const conn = await connectToBluetoothDevice(btDevice);
      setDevice(conn.device);
      setDeviceName(conn.device.name || '(no name)');
      setDeviceId(conn.device.id);
      setCharacteristic(conn.characteristic);
      setStatus('connected');
      try {
        localStorage.setItem(LS_KEY, conn.device.id);
      } catch {
        // ignore
      }
    } catch (e) {
      disconnect();
      throw e;
    }
  };

  const requestAndConnect = async () => {
    setStatus('connecting');
    try {
      const conn = await connectBluetoothEscPosPrinter();
      await connectTo(conn.device);
      await refreshPairedDevices();
    } finally {
      // connectTo sets final state
    }
  };

  const connectById = async (id: string) => {
    const devices = await listPairedBluetoothDevices();
    const found = devices.find((d) => d.id === id);
    if (!found) throw new Error('選択したデバイスが見つかりません（権限が未許可の可能性があります）');
    await connectTo(found);
  };

  const write = async (data: Uint8Array) => {
    if (!characteristic || status !== 'connected') {
      throw new Error('プリンターが未接続です');
    }
    await writeEscPos(characteristic, data);
  };

  const networkPrint = useCallback(async (data: Uint8Array) => {
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < data.length; i += chunk) {
      const sub = data.subarray(i, Math.min(i + chunk, data.length));
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    const base64 = btoa(binary);
    // Pass the context IP so printing works even if the DB write is momentarily delayed
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, ip: networkPrinterIp || undefined }),
    });
    const bodyText = await res.text();
    let json: any;
    try {
      json = JSON.parse(bodyText);
    } catch {
      throw new Error(
        `印刷APIから不正な応答が返されました (HTTP ${res.status})`
      );
    }
    if (!json.success) {
      setIsNetworkPrinterReady(false);
      throw new Error(json.error || 'ネットワーク印刷に失敗しました');
    }
    setIsNetworkPrinterReady(true);
  }, [networkPrinterIp]);

  const requestPrint = useCallback(
    async (
      data: Uint8Array,
      label?: string,
      options?: { osFallback?: () => void; eposPayload?: ReceiptPayload | FullReceiptPayload | ReceiptPayload[] }
    ) => {
      const jobLabel = label || '印刷';
      const osFallback = options?.osFallback;
      const eposPayload = options?.eposPayload;

      if (status === 'connected') {
        try {
          await write(data);
          success('印刷完了', `${jobLabel}をBluetoothプリンターへ送信しました`);
          return;
        } catch (e: any) {
          console.warn('BT print failed, falling through to next method:', e?.message);
          const nextMethod = networkPrinterIp ? 'ネットワーク印刷に切り替えます' : 'OS印刷ダイアログに切り替えます';
          error('Bluetooth印刷失敗', `${nextMethod}: ${e?.message || '不明なエラー'}`);
        }
      }

      if (networkPrinterIp) {
        try {
          if (eposPayload) {
            const { printReceiptViaEpos, printFullReceiptViaEpos, printReceiptsViaEpos } =
              await import('@/lib/printing/epos-print');
            if (Array.isArray(eposPayload)) {
              await printReceiptsViaEpos(networkPrinterIp, eposPayload);
            } else if ('orderLines' in eposPayload) {
              await printFullReceiptViaEpos(networkPrinterIp, eposPayload);
            } else {
              await printReceiptViaEpos(networkPrinterIp, eposPayload);
            }
            success('印刷完了', `${jobLabel}をWi-Fiプリンターへ送信しました`);
            return;
          }
          await networkPrint(data);
          success('印刷完了', `${jobLabel}をネットワークプリンターへ送信しました`);
          return;
        } catch (e: any) {
          console.warn('Network print failed, falling through to OS modal:', e?.message);
          if (!osFallback) {
            error('ネットワーク印刷失敗', `${e?.message || '不明なエラー'}`);
          }
        }
      }

      setPendingJob({ data, label: jobLabel, osFallback, eposPayload });
      setShowPrintConfirm(true);
    },
    [status, write, success, error, networkPrinterIp, networkPrint]
  );

  useEffect(() => {
    (async () => {
      await refreshNetworkPrinterIp();
      await refreshPairedDevices();

      let lastId: string | null = null;
      try {
        lastId = localStorage.getItem(LS_KEY);
      } catch {
        lastId = null;
      }
      if (!lastId) return;

      try {
        await connectById(lastId);
      } catch {
        // stay disconnected if cannot reconnect
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNetworkPrinterIp]);

  const value = useMemo<PrinterContextValue>(
    () => ({
      status,
      deviceName,
      deviceId,
      pairedDevices,
      networkPrinterIp,
      isNetworkPrinterReady,
      refreshPairedDevices,
      refreshNetworkPrinterIp,
      saveNetworkPrinterIp,
      clearNetworkPrinterIp,
      testNetworkPrinter,
      requestAndConnect,
      connectById,
      disconnect,
      write,
      networkPrint,
      requestPrint,
    }),
    [
      status,
      deviceName,
      deviceId,
      pairedDevices,
      networkPrinterIp,
      isNetworkPrinterReady,
      refreshPairedDevices,
      refreshNetworkPrinterIp,
      saveNetworkPrinterIp,
      clearNetworkPrinterIp,
      testNetworkPrinter,
      requestAndConnect,
      connectById,
      write,
      networkPrint,
      requestPrint,
    ]
  );

  return (
    <PrinterContext.Provider value={value}>
      {children}
      <PrintConfirmModal
        open={showPrintConfirm}
        onOpenChange={(v) => {
          setShowPrintConfirm(v);
          if (!v) setPendingJob(null);
        }}
        pendingJob={pendingJob}
        printerStatus={status}
        deviceName={deviceName}
        pairedDevices={pairedDevices}
        networkPrinterIp={networkPrinterIp}
        onRefreshDevices={refreshPairedDevices}
        onRequestConnect={requestAndConnect}
        onConnectById={connectById}
        onWrite={write}
        onNetworkPrint={networkPrint}
        onComplete={() => {
          setShowPrintConfirm(false);
          setPendingJob(null);
        }}
      />
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter must be used within PrinterProvider');
  return ctx;
}
