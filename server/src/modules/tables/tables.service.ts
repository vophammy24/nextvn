import { RestaurantAreaRepo, RestaurantTableRepo, OrderRepo } from '../../lib/repositories.js';

// Valid state transitions — server enforced
const VALID_TABLE_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['OCCUPIED', 'RESERVED'],
  OCCUPIED: ['NEED_PAYMENT', 'CLEANING'],
  RESERVED: ['OCCUPIED', 'AVAILABLE'],
  CLEANING: ['AVAILABLE'],
  NEED_PAYMENT: ['CLEANING', 'AVAILABLE'],
};

export async function getAreas(branchId: string) {
  return RestaurantAreaRepo.findMany({
    where: { branchId },
    orderBy: { displayOrder: 'asc' },
  });
}

export async function createArea(data: { branchId: string; name: string; displayOrder?: number }) {
  return RestaurantAreaRepo.create({
    data: {
      branchId: data.branchId,
      name: data.name,
      displayOrder: data.displayOrder ?? 0,
    },
  });
}

export async function getTables(branchId: string, areaId?: string) {
  const where: Record<string, unknown> = { branchId };
  if (areaId) where['areaId'] = areaId;

  return RestaurantTableRepo.findMany({
    where,
    include: { area: true },
    orderBy: { name: 'asc' },
  });
}

export async function getTableById(id: string, branchId: string) {
  return RestaurantTableRepo.findFirst({
    where: { id, branchId },
    include: { area: true },
  });
}

export async function createTable(data: {
  branchId: string;
  areaId: string;
  name: string;
  seats?: number;
}) {
  const area = await RestaurantAreaRepo.findFirst({
    where: { id: data.areaId, branchId: data.branchId },
  });

  if (!area) {
    throw new Error('Khu vực không hợp lệ hoặc không thuộc chi nhánh này.');
  }

  return RestaurantTableRepo.create({
    data: {
      branchId: data.branchId,
      areaId: data.areaId,
      name: data.name,
      seats: data.seats ?? 4,
      status: 'AVAILABLE',
    },
  });
}

export async function updateTableStatus(id: string, branchId: string, newStatus: string) {
  const table: { id: string; status: string } | null = await RestaurantTableRepo.findFirst({
    where: { id, branchId },
  });

  if (!table) return null;

  const allowed = VALID_TABLE_TRANSITIONS[table.status];
  if (!allowed?.includes(newStatus)) {
    throw new Error(`Không thể chuyển trạng thái bàn từ ${table.status} sang ${newStatus}.`);
  }

  return RestaurantTableRepo.update({
    where: { id },
    data: { status: newStatus },
  });
}

/**
 * Get the current active order for a table (if any).
 */
export async function getTableCurrentOrder(tableId: string, branchId: string) {
  const orders: Array<{ status: string; [key: string]: unknown }> = await OrderRepo.findMany({
    where: {
      tableId,
      branchId,
    },
    include: { items: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });

  // Return the latest non-closed order
  return (
    orders.find((o: { status: string }) => o.status === 'OPEN' || o.status === 'CONFIRMED') ?? null
  );
}
