import { OrderRepo, OrderItemRepo, OrderPaymentRepo } from '../../lib/repositories.js';
import { getMenuItemsByIds } from '../menu/menu.service.js';

import { atomicSale, salesDatabase, salesTransaction } from '../../lib/repositories.js';
import { db } from '../../prisma/db.js';
import { InventoryService } from '../../inventory/service.js';
import { PrismaInventoryStore } from '../../inventory/prisma-store.js';

export async function notifyInventoryConsumption(orderId: string): Promise<void> {
  const database = salesDatabase();
  const order = await database.orm.public.Order.where({ id: orderId }).include('items').first();
  if (!order || !['PAID', 'CONFIRMED'].includes(order.status))
    throw new Error('Đơn hàng chưa sẵn sàng thanh toán.');
  const branch = await database.orm.public.Branch.where({ id: order.branchId }).first();
  if (!branch) throw new Error('Chi nhánh không tồn tại.');
  const member = await database.orm.public.BusinessMember.where({
    businessId: branch.businessId,
    userId: order.cashierId,
    isActive: true,
  }).first();
  if (!member || member.branchId !== branch.id || member.role === 'OWNER')
    throw new Error('Thu ngân không thuộc chi nhánh.');
  // Reuse the caller's transaction; inventory acquires its usual branch lock.
  const storeDatabase = {
    raw: db.raw,
    transaction: async <T>(run: (tx: typeof database) => Promise<T>) => run(database),
  } as typeof db;
  await new InventoryService(new PrismaInventoryStore(storeDatabase)).consumeSale(
    {
      userId: order.cashierId,
      businessId: branch.businessId,
      role: member.role,
      branchIds: [branch.id],
    },
    { businessId: branch.businessId, branchId: branch.id },
    {
      orderId,
      state: order.status,
      items: order.items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        modifiers: [],
      })),
    },
  );
}

export interface CreateOrderInput {
  branchId: string;
  cashierId: string;
  tableId?: string | null;
  shiftId?: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  note?: string;
  discount?: number;
  items: Array<{
    menuItemId: string;
    quantity: number;
    note?: string;
  }>;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
}

interface MenuItemRecord {
  id: string;
  name: string;
  price: number;
  [key: string]: unknown;
}

export async function createOrder(input: CreateOrderInput) {
  return atomicSale(() => createOrderInTransaction(input));
}
async function createOrderInTransaction(input: CreateOrderInput) {
  // 1. Fetch authoritative menu prices from DB — NEVER trust frontend prices
  const menuItemIds = input.items.map((i) => i.menuItemId);
  const menuItems = (await getMenuItemsByIds(menuItemIds, input.branchId)) as MenuItemRecord[];

  const menuItemMap = new Map(menuItems.map((m: MenuItemRecord) => [m.id, m]));

  // 2. Validate all items exist
  for (const item of input.items) {
    if (!menuItemMap.has(item.menuItemId)) {
      throw new Error(`Món với mã ${item.menuItemId} không tồn tại hoặc đã ngừng bán.`);
    }
  }

  // 2.1 Validate table belongs to branch
  if (input.tableId) {
    const { RestaurantTableRepo } = await import('../../lib/repositories.js');
    const table = await RestaurantTableRepo.findFirst({
      where: { id: input.tableId, branchId: input.branchId },
    });
    if (!table) throw new Error('Bàn không hợp lệ hoặc không thuộc chi nhánh này.');
  }

  // 2.2 Validate shift belongs to branch
  if (input.shiftId) {
    const { ShiftRepo } = await import('../../lib/repositories.js');
    const shift = await ShiftRepo.findFirst({
      where: {
        id: input.shiftId,
        branchId: input.branchId,
        staffId: input.cashierId,
        status: 'ACTIVE',
      },
    });
    if (!shift) throw new Error('Ca làm việc không hợp lệ hoặc không thuộc chi nhánh này.');
  }

  // 3. Calculate authoritative totals from stored menu prices
  let subtotal = 0;
  const orderItems: Array<{
    menuItemId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    total: number;
    note: string | null;
  }> = [];

  for (const item of input.items) {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    const itemTotal = menuItem.price * item.quantity;
    subtotal += itemTotal;
    orderItems.push({
      menuItemId: item.menuItemId,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity: item.quantity,
      total: itemTotal,
      note: item.note ?? null,
    });
  }

  const discount = input.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  // 4. Create order with items
  const order = await OrderRepo.create({
    data: {
      branchId: input.branchId,
      tableId: input.tableId ?? null,
      shiftId: input.shiftId ?? null,
      cashierId: input.cashierId,
      orderType: input.orderType,
      status: 'CONFIRMED',
      subtotal,
      discount,
      total,
      note: input.note ?? null,
    },
  });

  // 5. Create order items
  for (const item of orderItems) {
    await OrderItemRepo.create({
      data: {
        orderId: order.id,
        ...item,
      },
    });
  }

  // 6. Create payment record
  await OrderPaymentRepo.create({
    data: {
      orderId: order.id,
      method: input.paymentMethod,
      amount: total,
    },
  });

  // 7. Mark order as PAID
  await OrderRepo.update({
    where: { id: order.id },
    data: { status: 'PAID' },
  });

  // 8. Notify inventory integration boundary
  await notifyInventoryConsumption(order.id);

  return { ...order, status: 'PAID' as const, items: orderItems };
}

export interface OrderFilters {
  branchId: string;
  page: number;
  limit: number;
  status?: string;
  orderType?: string;
  today?: boolean;
  shiftId?: string;
}

interface OrderRecord {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  payments: Array<{ method: string; amount: number }>;
  [key: string]: unknown;
}

export async function getOrders(filters: OrderFilters) {
  const where: Record<string, unknown> = { branchId: filters.branchId };

  if (filters.status) where['status'] = filters.status;
  if (filters.orderType) where['orderType'] = filters.orderType;
  if (filters.shiftId) where['shiftId'] = filters.shiftId;

  const allOrders: OrderRecord[] = await OrderRepo.findMany({
    where,
    include: { items: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by today if requested
  let filtered = allOrders;
  if (filters.today) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    filtered = allOrders.filter((o: OrderRecord) => new Date(o.createdAt) >= todayStart);
  }

  const total = filtered.length;
  const offset = (filters.page - 1) * filters.limit;
  const data = filtered.slice(offset, offset + filters.limit);

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getOrderById(id: string, branchId: string) {
  const order = await OrderRepo.findFirst({
    where: { id, branchId },
    include: { items: true, payments: true },
  });
  return order;
}

async function updateOrderStatusInTransaction(
  id: string,
  branchId: string,
  status: 'CONFIRMED' | 'PAID' | 'CANCELLED',
  paymentMethod?: 'CASH' | 'BANK_TRANSFER',
) {
  const order: {
    id: string;
    status: string;
    total: number;
    payments?: Array<{ id: string }>;
  } | null = await OrderRepo.findFirst({
    where: { id, branchId },
    include: { payments: true },
  });

  if (!order) return null;

  // Validate state transitions
  const validTransitions: Record<string, string[]> = {
    OPEN: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PAID', 'CANCELLED'],
    PAID: [],
    CANCELLED: [],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    throw new Error(`Không thể chuyển trạng thái đơn từ ${order.status} sang ${status}.`);
  }

  // Idempotency: if transitioning to PAID, ensure payment record exists
  if (status === 'PAID') {
    if (!paymentMethod) {
      throw new Error('paymentMethod is required to mark order as PAID');
    }
    const hasPayment = order.payments && order.payments.length > 0;
    if (!hasPayment) {
      await OrderPaymentRepo.create({
        data: {
          orderId: order.id,
          method: paymentMethod,
          amount: order.total,
        },
      });
      // Trigger integration boundary
      await notifyInventoryConsumption(order.id);
    }
  }

  return OrderRepo.update({
    where: { id },
    data: { status },
  });
}

export async function updateOrderStatus(
  id: string,
  branchId: string,
  status: 'CONFIRMED' | 'PAID' | 'CANCELLED',
  paymentMethod?: 'CASH' | 'BANK_TRANSFER',
) {
  return atomicSale(async () => {
    await salesTransaction
      .getStore()!
      .query(
        db.raw
          .sql`SELECT id FROM public."Order" WHERE id = ${id}::uuid AND "branchId" = ${branchId}::uuid FOR UPDATE`
          .returnsRow({ id: 'pg/uuid@1' })
          .build(),
      );
    return updateOrderStatusInTransaction(id, branchId, status, paymentMethod);
  });
}
