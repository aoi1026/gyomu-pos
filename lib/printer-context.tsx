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

type PrinterStatus = 'disconnected' | 'connecting' | 'connected';

type PrinterContextValue = {
  status: PrinterStatus;
  deviceName: string | null;
  deviceId: string | null;
  pairedDevices: Array<{ id: string; name: string }>;
  refreshPairedDevices: () => Promise<void>;
  requestAndConnect: () => Promise<void>;
  connectById: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  write: (data: Uint8Array) => Promise<void>;
  requestPrint: (data: Uint8Array, label?: string, osFallback?: () => void) => void;
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

  const [pendingJob, setPendingJob] = useState<PendingPrintJob | null>(null);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);

  const refreshPairedDevices = async () => {
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
  };

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

  const requestPrint = useCallback((data: Uint8Array, label?: string, osFallback?: () => void) => {
    setPendingJob({ data, label: label || '印刷', osFallback });
    setShowPrintConfirm(true);
  }, []);

  // Initial load: refresh paired + try auto reconnect to last device
  useEffect(() => {
    (async () => {
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
  }, []);

  const value = useMemo<PrinterContextValue>(
    () => ({
      status,
      deviceName,
      deviceId,
      pairedDevices,
      refreshPairedDevices,
      requestAndConnect,
      connectById,
      disconnect,
      write,
      requestPrint,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, deviceName, deviceId, pairedDevices, requestPrint]
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
        onRefreshDevices={refreshPairedDevices}
        onRequestConnect={requestAndConnect}
        onConnectById={connectById}
        onWrite={write}
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
