import { ShiftRepo, OrderRepo } from '../../lib/repositories.js';

export async function getActiveShift(staffId: string, branchId: string) {
  const shifts: Array<{
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    branchId: string;
    staffId: string;
  }> = await ShiftRepo.findMany({
    where: {
      staffId,
      branchId,
      status: 'ACTIVE',
    },
  });
  return shifts[0] ?? null;
}

export async function startShift(staffId: string, branchId: string) {
  // Check for existing active shift
  const existing = await getActiveShift(staffId, branchId);
  if (existing) {
    throw new Error('Bạn đã có ca làm việc đang hoạt động.');
  }

  return ShiftRepo.create({
    data: {
      branchId,
      staffId,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
    },
  });
}

export async function endShift(shiftId: string, staffId: string) {
  const shift: { id: string; status: string } | null = await ShiftRepo.findFirst({
    where: { id: shiftId, staffId },
  });

  if (!shift) return null;
  if (shift.status !== 'ACTIVE') {
    throw new Error('Ca làm việc đã kết thúc.');
  }

  return ShiftRepo.update({
    where: { id: shiftId },
    data: {
      status: 'CLOSED',
      endedAt: new Date().toISOString(),
    },
  });
}

export async function getShiftById(shiftId: string) {
  return ShiftRepo.findFirst({
    where: { id: shiftId },
  });
}

/**
 * Calculate shift summary by aggregating orders in the shift.
 * Values are derived from order data — not persisted redundantly.
 */
export async function getShiftSummary(shiftId: string, branchId: string) {
  const shift = await ShiftRepo.findFirst({
    where: { id: shiftId, branchId },
  });

  if (!shift) return null;

  const orders: Array<{
    status: string;
    total: number;
    payments: Array<{ method: string; amount: number }>;
  }> = await OrderRepo.findMany({
    where: { shiftId, branchId },
    include: { payments: true },
  });

  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

  let totalRevenue = 0;
  let cashReceived = 0;
  let bankTransferReceived = 0;

  for (const order of paidOrders) {
    totalRevenue += order.total;
    for (const payment of order.payments) {
      if (payment.method === 'CASH') cashReceived += payment.amount;
      if (payment.method === 'BANK_TRANSFER') bankTransferReceived += payment.amount;
    }
  }

  return {
    shift,
    summary: {
      totalOrders,
      paidOrders: paidOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      cashReceived,
      bankTransferReceived,
    },
  };
}

export async function getShifts(branchId: string, staffId?: string) {
  const where: Record<string, unknown> = { branchId };
  if (staffId) where['staffId'] = staffId;

  return ShiftRepo.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}
