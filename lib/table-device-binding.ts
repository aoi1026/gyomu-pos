// Table-Device binding utilities for kiosk management
export interface DeviceBinding {
  tableId: string;
  deviceToken: string;
  boundAt: string;
  lastActivity: string;
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
  };
}

export interface TableDeviceStatus {
  tableId: string;
  isBound: boolean;
  deviceToken?: string;
  lastActivity?: string;
  isOnline: boolean;
}

// Generate a unique device token
export function generateDeviceToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `device_${timestamp}_${random}`;
}

// Bind a device to a table
export function bindDeviceToTable(tableId: string): DeviceBinding {
  const deviceToken = generateDeviceToken();
  const now = new Date().toISOString();
  
  const binding: DeviceBinding = {
    tableId,
    deviceToken,
    boundAt: now,
    lastActivity: now,
    deviceInfo: {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };

  // Store in localStorage
  localStorage.setItem(`kiosk_device_${tableId}`, deviceToken);
  localStorage.setItem(`device_binding_${deviceToken}`, JSON.stringify(binding));
  
  // Store in global device bindings
  const bindings = getDeviceBindings();
  bindings[tableId] = binding;
  localStorage.setItem('table_device_bindings', JSON.stringify(bindings));

  return binding;
}

// Get device binding for a table
export function getDeviceBinding(tableId: string): DeviceBinding | null {
  const deviceToken = localStorage.getItem(`kiosk_device_${tableId}`);
  if (!deviceToken) return null;

  const bindingData = localStorage.getItem(`device_binding_${deviceToken}`);
  if (!bindingData) return null;

  try {
    return JSON.parse(bindingData);
  } catch {
    return null;
  }
}

// Get all device bindings
export function getDeviceBindings(): Record<string, DeviceBinding> {
  const bindingsData = localStorage.getItem('table_device_bindings');
  if (!bindingsData) return {};

  try {
    return JSON.parse(bindingsData);
  } catch {
    return {};
  }
}

// Update device activity
export function updateDeviceActivity(tableId: string): void {
  const binding = getDeviceBinding(tableId);
  if (!binding) return;

  binding.lastActivity = new Date().toISOString();
  localStorage.setItem(`device_binding_${binding.deviceToken}`, JSON.stringify(binding));

  // Update global bindings
  const bindings = getDeviceBindings();
  bindings[tableId] = binding;
  localStorage.setItem('table_device_bindings', JSON.stringify(bindings));
}

// Unbind device from table
export function unbindDeviceFromTable(tableId: string): void {
  const binding = getDeviceBinding(tableId);
  if (binding) {
    localStorage.removeItem(`device_binding_${binding.deviceToken}`);
  }
  
  localStorage.removeItem(`kiosk_device_${tableId}`);

  // Update global bindings
  const bindings = getDeviceBindings();
  delete bindings[tableId];
  localStorage.setItem('table_device_bindings', JSON.stringify(bindings));
}

// Check if device is bound to table
export function isDeviceBoundToTable(tableId: string): boolean {
  return localStorage.getItem(`kiosk_device_${tableId}`) !== null;
}

// Get device token for table
export function getDeviceToken(tableId: string): string | null {
  return localStorage.getItem(`kiosk_device_${tableId}`);
}

// Get table device status
export function getTableDeviceStatus(tableId: string): TableDeviceStatus {
  const binding = getDeviceBinding(tableId);
  const isBound = binding !== null;
  
  if (!isBound) {
    return {
      tableId,
      isBound: false,
      isOnline: false
    };
  }

  // Check if device is online (activity within last 5 minutes)
  const lastActivity = new Date(binding.lastActivity);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const isOnline = lastActivity > fiveMinutesAgo;

  return {
    tableId,
    isBound: true,
    deviceToken: binding.deviceToken,
    lastActivity: binding.lastActivity,
    isOnline
  };
}

// Get all table device statuses
export function getAllTableDeviceStatuses(): TableDeviceStatus[] {
  const bindings = getDeviceBindings();
  return Object.keys(bindings).map(tableId => getTableDeviceStatus(tableId));
}

// Validate device access to table
export function validateDeviceAccess(tableId: string): boolean {
  const deviceToken = getDeviceToken(tableId);
  if (!deviceToken) return false;

  const binding = getDeviceBinding(tableId);
  if (!binding) return false;

  // Check if device token matches
  if (binding.deviceToken !== deviceToken) return false;

  // Update activity on successful validation
  updateDeviceActivity(tableId);
  
  return true;
}

// Generate QR code URL for table
export function generateTableQRUrl(tableId: string, baseUrl?: string): string {
  const url = baseUrl || window.location.origin;
  return `${url}/kiosk/${tableId}`;
}

// Get device binding statistics
export function getDeviceBindingStats() {
  const bindings = getDeviceBindings();
  const statuses = getAllTableDeviceStatuses();
  
  return {
    totalBindings: Object.keys(bindings).length,
    onlineDevices: statuses.filter(s => s.isOnline).length,
    offlineDevices: statuses.filter(s => s.isBound && !s.isOnline).length,
    unboundTables: statuses.filter(s => !s.isBound).length
  };
}

// Clean up old device bindings (older than 24 hours)
export function cleanupOldBindings(): void {
  const bindings = getDeviceBindings();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  Object.entries(bindings).forEach(([tableId, binding]) => {
    const boundAt = new Date(binding.boundAt);
    if (boundAt < oneDayAgo) {
      unbindDeviceFromTable(tableId);
    }
  });
}

// Initialize device binding system
export function initializeDeviceBinding(): void {
  // Clean up old bindings on initialization
  cleanupOldBindings();
  
  // Set up activity tracking
  if (typeof window !== 'undefined') {
    // Track user activity
    const updateActivity = () => {
      const currentPath = window.location.pathname;
      const tableIdMatch = currentPath.match(/\/kiosk\/([^\/]+)/);
      if (tableIdMatch) {
        updateDeviceActivity(tableIdMatch[1]);
      }
    };

    // Update activity on various events
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Update activity every minute
    setInterval(updateActivity, 60000);
  }
}
