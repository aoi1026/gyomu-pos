// Payroll calculation utilities - Updated for table-first approach
import { Order, OrderItem, Staff, PayrollItem } from './mock-data';
import { getCastNominationSummary } from './nomination-system';

export interface CastSalesData {
  staff_id: string;
  staff_name: string;
  nomination_count: number;
  bottle_sales_yen: number;
  total_sales_yen: number;
  commission_yen: number;
  order_items: OrderItem[];
}

export interface PayrollCalculation {
  base_hours: number;
  base_wage_yen: number;
  nomination_count: number;
  nomination_amount_yen: number;
  field_nomination_count: number;
  field_nomination_amount_yen: number;
  bottle_sales_yen: number;
  drink_back_yen: number;
  overtime_hours: number;
  overtime_wage_yen: number;
  deduction_yen: number;
  total_yen: number;
}

// Calculate cast sales data from orders (using OrderItem.castId as primary source)
export function calculateCastSales(
  orders: Order[],
  staff: Staff[],
  periodStart: string,
  periodEnd: string
): CastSalesData[] {
  const staffSalesMap = new Map<string, {
    staff: Staff;
    orderItems: OrderItem[];
    bottleSales: number;
    totalSales: number;
  }>();

  // Filter orders within the period
  const periodOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    return orderDate >= start && orderDate <= end;
  });

  // Process each order item
  periodOrders.forEach(order => {
    order.items.forEach(item => {
      if (item.cast_id && !item.canceled) {
        const staffMember = staff.find(s => s.id === item.cast_id);
        if (!staffMember) return;

        if (!staffSalesMap.has(item.cast_id)) {
          staffSalesMap.set(item.cast_id, {
            staff: staffMember,
            orderItems: [],
            bottleSales: 0,
            totalSales: 0
          });
        }

        const salesData = staffSalesMap.get(item.cast_id)!;
        salesData.orderItems.push(item);
        salesData.totalSales += item.line_subtotal_yen;

        // Check if it's a bottle sale
        if (item.menu_item.is_bottle) {
          salesData.bottleSales += item.line_subtotal_yen;
        }
      }
    });
  });

  // Convert to array and calculate commission
  return Array.from(staffSalesMap.values()).map(data => {
    const nominationCount = data.orderItems.length;
    const commissionRate = 0.1; // 10% commission rate
    const bottleBackRate = 0.05; // 5% bottle back rate

    return {
      staff_id: data.staff.id,
      staff_name: data.staff.name,
      nomination_count: nominationCount,
      bottle_sales_yen: data.bottleSales,
      total_sales_yen: data.totalSales,
      commission_yen: Math.round(data.totalSales * commissionRate),
      order_items: data.orderItems
    };
  });
}

// Calculate payroll for a specific staff member
export async function calculateStaffPayroll(
  staff: Staff,
  castSalesData: CastSalesData,
  baseHours: number,
  overtimeHours: number = 0,
  deductionYen: number = 0,
  periodStart?: string,
  periodEnd?: string
): Promise<PayrollCalculation> {
  const hourlyWage = staff.hourly_wage_yen;
  const overtimeRate = 1.25; // 25% overtime rate

  const baseWage = baseHours * hourlyWage;
  const overtimeWage = overtimeHours * hourlyWage * overtimeRate;

  // 指名料データを取得
  const nominationSummary = getCastNominationSummary(staff.id, periodStart);
  
  // ドリンクバックを計算（売上データから）
  const bottleBack = Math.round(castSalesData.bottle_sales_yen * 0.05); // 5% bottle back rate

  const totalYen = baseWage + overtimeWage + 
    nominationSummary.total_nomination_amount + 
    nominationSummary.total_field_nomination_amount + 
    bottleBack - deductionYen;

  return {
    base_hours: baseHours,
    base_wage_yen: baseWage,
    nomination_count: nominationSummary.nomination_count,
    nomination_amount_yen: nominationSummary.total_nomination_amount,
    field_nomination_count: nominationSummary.field_nomination_count,
    field_nomination_amount_yen: nominationSummary.total_field_nomination_amount,
    bottle_sales_yen: castSalesData.bottle_sales_yen,
    drink_back_yen: bottleBack,
    overtime_hours: overtimeHours,
    overtime_wage_yen: overtimeWage,
    deduction_yen: deductionYen,
    total_yen: totalYen
  };
}

// Calculate total store sales for a period
export function calculateStoreSales(
  orders: Order[],
  periodStart: string,
  periodEnd: string
) {
  const periodOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    return orderDate >= start && orderDate <= end;
  });

  return periodOrders.reduce((total, order) => {
    return {
      subtotal_yen: total.subtotal_yen + order.subtotal_yen,
      service_charge_yen: total.service_charge_yen + order.service_charge_yen,
      tax_yen: total.tax_yen + order.tax_yen,
      discount_yen: total.discount_yen + order.discount_yen,
      total_yen: total.total_yen + order.total_yen,
      order_count: total.order_count + 1
    };
  }, {
    subtotal_yen: 0,
    service_charge_yen: 0,
    tax_yen: 0,
    discount_yen: 0,
    total_yen: 0,
    order_count: 0
  });
}

// Get cast performance ranking
export function getCastRanking(castSalesData: CastSalesData[]): CastSalesData[] {
  return castSalesData
    .sort((a, b) => b.total_sales_yen - a.total_sales_yen)
    .map((cast, index) => ({
      ...cast,
      rank: index + 1
    }));
}

// Calculate table-specific sales (for table monitoring)
export function calculateTableSales(
  orders: Order[],
  tableId: string,
  periodStart?: string,
  periodEnd?: string
) {
  let filteredOrders = orders.filter(order => order.table_seat_id === tableId);

  if (periodStart && periodEnd) {
    filteredOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      return orderDate >= start && orderDate <= end;
    });
  }

  return filteredOrders.reduce((total, order) => {
    return {
      subtotal_yen: total.subtotal_yen + order.subtotal_yen,
      service_charge_yen: total.service_charge_yen + order.service_charge_yen,
      tax_yen: total.tax_yen + order.tax_yen,
      discount_yen: total.discount_yen + order.discount_yen,
      total_yen: total.total_yen + order.total_yen,
      order_count: total.order_count + 1
    };
  }, {
    subtotal_yen: 0,
    service_charge_yen: 0,
    tax_yen: 0,
    discount_yen: 0,
    total_yen: 0,
    order_count: 0
  });
}

// Get cast assignments for a specific table
export function getTableCastAssignments(
  orders: Order[],
  tableId: string
): { cast_id: string; cast_name: string; item_count: number; total_sales: number }[] {
  const tableOrders = orders.filter(order => order.table_seat_id === tableId);
  const castMap = new Map<string, { cast_name: string; item_count: number; total_sales: number }>();

  tableOrders.forEach(order => {
    order.items.forEach(item => {
      if (item.cast_id && !item.canceled) {
        if (!castMap.has(item.cast_id)) {
          castMap.set(item.cast_id, {
            cast_name: `Cast ${item.cast_id.slice(-4)}`, // This would be resolved from staff data
            item_count: 0,
            total_sales: 0
          });
        }

        const castData = castMap.get(item.cast_id)!;
        castData.item_count += item.qty;
        castData.total_sales += item.line_subtotal_yen;
      }
    });
  });

  return Array.from(castMap.entries()).map(([cast_id, data]) => ({
    cast_id,
    ...data
  }));
}
