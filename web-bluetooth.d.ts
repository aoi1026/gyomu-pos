// Minimal Web Bluetooth typings for projects where TS lib DOM typings are missing or incomplete.
// This is intentionally small: only the subset used by this repo.

type BluetoothServiceUUID = string | number;

interface BluetoothCharacteristicProperties {
  write?: boolean;
  writeWithoutResponse?: boolean;
}

interface BluetoothRemoteGATTCharacteristic {
  properties: BluetoothCharacteristicProperties;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothDeviceRequestOptions {
  acceptAllDevices?: boolean;
  optionalServices?: BluetoothServiceUUID[];
  filters?: Array<{ services?: BluetoothServiceUUID[]; name?: string; namePrefix?: string }>;
}

interface Bluetooth {
  requestDevice(options: BluetoothDeviceRequestOptions): Promise<BluetoothDevice>;
  getDevices?(): Promise<BluetoothDevice[]>;
}

interface Navigator {
  bluetooth?: Bluetooth;
}

