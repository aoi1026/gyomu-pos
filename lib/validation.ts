// Validation utilities for table-first approach
import { Order, OrderItem, ServiceSession } from './mock-data';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Validate order data
export function validateOrder(order: Partial<Order>): ValidationResult {
  const errors: ValidationError[] = [];

  // Table ID is required
  if (!order.table_seat_id) {
    errors.push({
      field: 'table_seat_id',
      message: 'テーブルIDは必須です',
      code: 'REQUIRED_TABLE_ID'
    });
  }

  // Session ID is required
  if (!order.session_id) {
    errors.push({
      field: 'session_id',
      message: 'セッションIDは必須です',
      code: 'REQUIRED_SESSION_ID'
    });
  }

  // Store ID is required
  if (!order.store_id) {
    errors.push({
      field: 'store_id',
      message: '店舗IDは必須です',
      code: 'REQUIRED_STORE_ID'
    });
  }

  // Items validation
  if (!order.items || order.items.length === 0) {
    errors.push({
      field: 'items',
      message: '注文アイテムがありません',
      code: 'REQUIRED_ITEMS'
    });
  }

  // Validate each order item
  if (order.items) {
    order.items.forEach((item, index) => {
      const itemErrors = validateOrderItem(item, index);
      errors.push(...itemErrors);
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate order item data
export function validateOrderItem(item: Partial<OrderItem>, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Menu item ID is required
  if (!item.menu_item_id) {
    errors.push({
      field: `items[${index}].menu_item_id`,
      message: 'メニューアイテムIDは必須です',
      code: 'REQUIRED_MENU_ITEM_ID'
    });
  }

  // Quantity must be positive
  if (!item.qty || item.qty <= 0) {
    errors.push({
      field: `items[${index}].qty`,
      message: '数量は1以上である必要があります',
      code: 'INVALID_QUANTITY'
    });
  }

  // Unit price must be positive
  if (!item.unit_price_yen || item.unit_price_yen <= 0) {
    errors.push({
      field: `items[${index}].unit_price_yen`,
      message: '単価は0より大きい必要があります',
      code: 'INVALID_UNIT_PRICE'
    });
  }

  // Line subtotal validation
  if (item.qty && item.unit_price_yen && item.line_subtotal_yen) {
    const expectedSubtotal = item.qty * item.unit_price_yen;
    if (Math.abs(item.line_subtotal_yen - expectedSubtotal) > 0.01) {
      errors.push({
        field: `items[${index}].line_subtotal_yen`,
        message: '小計金額が正しくありません',
        code: 'INVALID_LINE_SUBTOTAL'
      });
    }
  }

  // Cast ID is optional but if provided, should be valid format
  if (item.cast_id && !isValidStaffId(item.cast_id)) {
    errors.push({
      field: `items[${index}].cast_id`,
      message: 'キャストIDの形式が正しくありません',
      code: 'INVALID_CAST_ID'
    });
  }

  return errors;
}

// Validate service session data
export function validateServiceSession(session: Partial<ServiceSession>): ValidationResult {
  const errors: ValidationError[] = [];

  // Table seat ID is required
  if (!session.table_seat_id) {
    errors.push({
      field: 'table_seat_id',
      message: 'テーブルIDは必須です',
      code: 'REQUIRED_TABLE_ID'
    });
  }

  // Store ID is required
  if (!session.store_id) {
    errors.push({
      field: 'store_id',
      message: '店舗IDは必須です',
      code: 'REQUIRED_STORE_ID'
    });
  }

  // Opened at is required
  if (!session.opened_at) {
    errors.push({
      field: 'opened_at',
      message: '開始時刻は必須です',
      code: 'REQUIRED_OPENED_AT'
    });
  }

  // Business date is required
  if (!session.business_date) {
    errors.push({
      field: 'business_date',
      message: '営業日は必須です',
      code: 'REQUIRED_BUSINESS_DATE'
    });
  }

  // Status validation
  if (session.status && !['open', 'settled', 'void'].includes(session.status)) {
    errors.push({
      field: 'status',
      message: 'ステータスが無効です',
      code: 'INVALID_STATUS'
    });
  }

  // Participating casts validation
  if (session.participating_casts) {
    session.participating_casts.forEach((cast, index) => {
      if (!cast.staff_id) {
        errors.push({
          field: `participating_casts[${index}].staff_id`,
          message: 'キャストIDは必須です',
          code: 'REQUIRED_CAST_ID'
        });
      }

      if (!cast.joined_at) {
        errors.push({
          field: `participating_casts[${index}].joined_at`,
          message: '参加時刻は必須です',
          code: 'REQUIRED_JOINED_AT'
        });
      }

      if (typeof cast.is_primary !== 'boolean') {
        errors.push({
          field: `participating_casts[${index}].is_primary`,
          message: 'メインキャストフラグは必須です',
          code: 'REQUIRED_IS_PRIMARY'
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate table ID format
export function isValidTableId(tableId: string): boolean {
  return /^table-\d+$|^counter-\d+$|^vip-\d+$|^private-\d+$/.test(tableId);
}

// Validate staff ID format
export function isValidStaffId(staffId: string): boolean {
  return /^staff-\d+$|^admin-\d+$|^superadmin-\d+$/.test(staffId);
}

// Validate device token format
export function isValidDeviceToken(token: string): boolean {
  return /^device_\d+_[a-z0-9]+$/.test(token);
}

// Validate order submission
export function validateOrderSubmission(order: Partial<Order>): ValidationResult {
  const orderValidation = validateOrder(order);
  
  if (!orderValidation.isValid) {
    return orderValidation;
  }

  // Additional business logic validations
  const errors: ValidationError[] = [];

  // Check if order has valid items
  if (order.items && order.items.length > 0) {
    const hasValidItems = order.items.some(item => 
      item.menu_item_id && 
      item.qty && 
      item.qty > 0 && 
      !item.canceled
    );

    if (!hasValidItems) {
      errors.push({
        field: 'items',
        message: '有効な注文アイテムがありません',
        code: 'NO_VALID_ITEMS'
      });
    }
  }

  // Check total amount consistency
  if (order.items && order.subtotal_yen) {
    const calculatedSubtotal = order.items.reduce((sum, item) => 
      sum + (item.line_subtotal_yen || 0), 0
    );

    if (Math.abs(order.subtotal_yen - calculatedSubtotal) > 0.01) {
      errors.push({
        field: 'subtotal_yen',
        message: '小計金額が一致しません',
        code: 'SUBTOTAL_MISMATCH'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors: [...orderValidation.errors, ...errors]
  };
}

// Validate cast assignment
export function validateCastAssignment(
  castId: string, 
  menuItemId: string, 
  availableCasts: string[]
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!castId) {
    return { isValid: true, errors: [] }; // Cast assignment is optional
  }

  if (!isValidStaffId(castId)) {
    errors.push({
      field: 'cast_id',
      message: 'キャストIDの形式が正しくありません',
      code: 'INVALID_CAST_ID'
    });
  }

  if (!availableCasts.includes(castId)) {
    errors.push({
      field: 'cast_id',
      message: '指定されたキャストは利用できません',
      code: 'CAST_NOT_AVAILABLE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get validation error message in Japanese
export function getValidationErrorMessage(error: ValidationError): string {
  return error.message;
}

// Get all validation error messages
export function getValidationErrorMessages(result: ValidationResult): string[] {
  return result.errors.map(getValidationErrorMessage);
}
