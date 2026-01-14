export type BluetoothEscPosConnection = {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
};

// Common BLE UART / printer service UUIDs seen in the wild.
// Epson TM printers differ by adapter/firmware; we try a broad set and then pick the first writable characteristic.
const OPTIONAL_SERVICE_UUIDS: BluetoothServiceUUID[] = [
  // Nordic UART Service (NUS)
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  // HM-10 / CC254x style
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  // Some BLE-to-serial adapters
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  // Device Information (sometimes needed to satisfy Chrome permission model)
  'device_information',
];

async function findWritableCharacteristic(
  server: BluetoothRemoteGATTServer
): Promise<BluetoothRemoteGATTCharacteristic> {
  // Try requested optional services first.
  for (const serviceId of OPTIONAL_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceId);
      const chars = await service.getCharacteristics();
      const writable =
        chars.find((c) => c.properties.writeWithoutResponse) ??
        chars.find((c) => c.properties.write);
      if (writable) return writable;
    } catch {
      // ignore and continue
    }
  }

  // As a fallback, try enumerating whatever services Chrome allows (may be empty).
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    const writable =
      chars.find((c) => c.properties.writeWithoutResponse) ??
      chars.find((c) => c.properties.write);
    if (writable) return writable;
  }

  throw new Error('書き込み可能なBluetooth特性（characteristic）が見つかりませんでした');
}

export async function listPairedBluetoothDevices(): Promise<BluetoothDevice[]> {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) return [];
  // getDevices() returns previously permitted devices (not an active scan).
  // Not supported in all browsers; treat as best-effort.
  if (typeof navigator.bluetooth.getDevices !== 'function') return [];
  return await navigator.bluetooth.getDevices();
}

export async function connectToBluetoothDevice(device: BluetoothDevice): Promise<BluetoothEscPosConnection> {
  if (!device.gatt) {
    throw new Error('Bluetooth GATTが利用できません');
  }
  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);
  return { device, characteristic };
}

export async function connectBluetoothEscPosPrinter(): Promise<BluetoothEscPosConnection> {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    throw new Error('このブラウザはWeb Bluetoothに対応していません（Chrome推奨）');
  }

  // Opens the browser device chooser.
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: OPTIONAL_SERVICE_UUIDS,
  });

  if (!device.gatt) {
    throw new Error('Bluetooth GATTが利用できません');
  }

  return await connectToBluetoothDevice(device);
}

export async function writeEscPos(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
  opts?: { chunkSize?: number }
) {
  // BLE MTU varies; chunk to be safe.
  const chunkSize = Math.max(20, Math.min(opts?.chunkSize ?? 180, 512));
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (characteristic.properties.writeWithoutResponse) {
      // @ts-expect-error - TS lib dom types vary by version; runtime supports it.
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    // Small pacing helps some printers.
    await new Promise((r) => setTimeout(r, 10));
  }
}

