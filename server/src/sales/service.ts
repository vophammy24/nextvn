import { db } from '../prisma/db.js';
import { salesTransaction } from '../lib/repositories.js';
import { notifyInventoryConsumption } from '../modules/orders/orders.service.js';
import { defaultSettings, deny, hash, type SalesSettings } from './domain.js';
import type { z } from 'zod';
import type { orderInput, editInput } from './domain.js';

type Database = typeof db;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
export interface SalesPrincipal {
  businessId: string;
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  branchId: string | null;
}
type NewOrder = z.infer<typeof orderInput>;
type EditOrder = z.infer<typeof editInput>;
const openStatuses = ['OPEN', 'CONFIRMED'];
const normalized = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('vi-VN');

export class SalesService {
  constructor(private database: Database = db) {}
  private async branch(principal: SalesPrincipal, branchId: string, write = false) {
    if (principal.role !== 'OWNER' && principal.branchId !== branchId)
      deny(403, 'FORBIDDEN', 'Bạn không được phép truy cập chi nhánh này.');
    if (write && principal.role === 'STAFF')
      deny(403, 'FORBIDDEN', 'Nhân viên không được sửa cấu hình.');
    const branch = await this.database.orm.public.Branch.where({
      id: branchId,
      businessId: principal.businessId,
      isActive: true,
    })
      .select('id')
      .first();
    if (!branch) deny(404, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại hoặc chưa hoạt động.');
  }
  private operational(principal: SalesPrincipal, branchId: string) {
    if (principal.role === 'OWNER' || principal.branchId !== branchId)
      deny(403, 'FORBIDDEN', 'Bạn không được phép thao tác bán hàng tại chi nhánh này.');
  }
  private async lockBranch(tx: Tx, businessId: string, branchId: string) {
    const rows = await tx.query(
      this.database.raw
        .sql`SELECT id FROM public."Branch" WHERE id = ${branchId}::uuid AND "businessId" = ${businessId}::uuid AND "isActive" = true FOR UPDATE`
        .returnsRow({ id: 'pg/uuid@1' })
        .build(),
    );
    if (!rows.length) deny(404, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại hoặc chưa hoạt động.');
  }
  private async settingsRow(orm: Tx['orm']['public'], branchId: string): Promise<SalesSettings> {
    const row = await orm.BranchSalesSettings.where({ branchId }).first();
    return row
      ? {
          serviceType: row.serviceType,
          counterPaymentPolicy: row.counterPaymentPolicy,
          dineInOrderingMode: row.dineInOrderingMode,
        }
      : defaultSettings;
  }
  async getSettings(principal: SalesPrincipal, branchId: string) {
    await this.branch(principal, branchId);
    return this.settingsRow(this.database.orm.public, branchId);
  }
  async updateSettings(principal: SalesPrincipal, branchId: string, value: SalesSettings) {
    await this.branch(principal, branchId, true);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const disablesTables =
        value.serviceType === 'TAKEAWAY' || value.dineInOrderingMode === 'COUNTER_ONLY';
      if (disablesTables) {
        const open = await orm.Order.where({ branchId }).select('status', 'tableId').all();
        if (open.some((order) => order.tableId && openStatuses.includes(order.status)))
          deny(
            409,
            'TABLE_ORDERS_OPEN',
            'Còn đơn tại bàn chưa thanh toán; cần xử lý trước khi tắt phục vụ tại bàn.',
          );
      }
      const previous = await orm.BranchSalesSettings.where({ branchId }).first();
      if (previous) await orm.BranchSalesSettings.where({ branchId }).update(value);
      else await orm.BranchSalesSettings.create({ branchId, ...value });
      return value;
    });
  }
  private async activeShift(orm: Tx['orm']['public'], branchId: string, userId: string) {
    const shift = await orm.Shift.where({ branchId, staffId: userId, status: 'ACTIVE' }).first();
    if (!shift) deny(409, 'SHIFT_REQUIRED', 'Vui lòng bắt đầu ca làm việc trước khi bán hàng.');
    return shift!;
  }
  private async tableAvailable(
    orm: Tx['orm']['public'],
    branchId: string,
    tableId: string,
    excludeOrderId?: string,
  ) {
    const table = await orm.RestaurantTable.where({
      id: tableId,
      branchId,
      isActive: true,
    }).first();
    if (!table || !['AVAILABLE', 'OCCUPIED', 'NEED_PAYMENT'].includes(table.status))
      deny(409, 'TABLE_UNAVAILABLE', 'Bàn không khả dụng trong chi nhánh.');
    const area = await orm.RestaurantArea.where({
      id: table!.areaId,
      branchId,
      isActive: true,
    }).first();
    if (!area) deny(409, 'AREA_UNAVAILABLE', 'Khu vực của bàn đã ngừng hoạt động.');
    const orders = await orm.Order.where({ branchId, tableId }).select('id', 'status').all();
    if (orders.some((order) => order.id !== excludeOrderId && openStatuses.includes(order.status)))
      deny(409, 'TABLE_OCCUPIED', 'Bàn đang có đơn chưa thanh toán.');
    return table!;
  }
  private async pricedItems(orm: Tx['orm']['public'], branchId: string, items: NewOrder['items']) {
    const menu = await orm.MenuItem.where({ branchId, isActive: true })
      .select('id', 'name', 'price')
      .all();
    const map = new Map(menu.map((item) => [item.id, item]));
    const recipes = await orm.Recipe.where({ branchId }).select('menuItemId', 'modifiers').all();
    const modifiers = new Map(
      recipes.map((recipe) => [
        recipe.menuItemId,
        recipe.modifiers as unknown as { key: string; priceExtra: number }[],
      ]),
    );
    let subtotal = 0;
    const rows = [];
    for (const line of items) {
      const item = map.get(line.menuItemId);
      if (!item)
        deny(404, 'MENU_ITEM_NOT_FOUND', 'Món không thuộc thực đơn đang bán của chi nhánh.');
      if (new Set(line.modifierKeys).size !== line.modifierKeys.length)
        deny(400, 'MODIFIER_DUPLICATE', 'Tùy chọn bị lặp trong cùng món.');
      const available = modifiers.get(line.menuItemId) ?? [];
      let extra = 0;
      for (const key of line.modifierKeys) {
        const selected = available.find((modifier) => modifier.key === key);
        if (!selected) deny(400, 'MODIFIER_UNKNOWN', 'Tùy chọn không thuộc công thức của món.');
        extra += selected!.priceExtra;
      }
      const unitPrice = item!.price + extra;
      const total = unitPrice * line.quantity;
      if (!Number.isSafeInteger(total) || total < 0)
        deny(400, 'TOTAL_INVALID', 'Giá trị đơn hàng vượt giới hạn.');
      subtotal += total;
      rows.push({
        menuItemId: line.menuItemId,
        name: item!.name,
        unitPrice,
        quantity: line.quantity,
        total,
        note: line.note || null,
        modifierKeys: line.modifierKeys,
      });
    }
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0)
      deny(400, 'TOTAL_INVALID', 'Tổng tiền đơn hàng không hợp lệ.');
    return { rows, subtotal };
  }
  private async orderView(orm: Tx['orm']['public'], id: string, branchId: string) {
    return orm.Order.where({ id, branchId }).include('items').include('payments').first();
  }
  async createOrder(principal: SalesPrincipal, value: NewOrder) {
    this.operational(principal, value.branchId);
    await this.branch(principal, value.branchId);
    if (value.paymentTiming === 'NOW')
      deny(400, 'CHECKOUT_REQUIRED', 'Đơn thu tiền ngay phải dùng API thanh toán cùng lúc.');
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, value.branchId);
      return this.createOrderInTransaction(tx, principal, value);
    });
  }
  private async createOrderInTransaction(tx: Tx, principal: SalesPrincipal, value: NewOrder) {
    const requestHash = hash(value);
    const orm = tx.orm.public;
    const previous = await orm.Order.where({ requestKey: value.requestKey }).first();
    if (previous) {
      if (previous!.branchId !== value.branchId || previous!.requestHash !== requestHash)
        deny(409, 'REQUEST_KEY_CONFLICT', 'Mã yêu cầu đã dùng cho đơn khác.');
      return this.orderView(orm, previous!.id, value.branchId);
    }
    const settings = await this.settingsRow(orm, value.branchId);
    const { validateFlow } = await import('./domain.js');
    validateFlow(settings, value, value.paymentTiming);
    const shift = await this.activeShift(orm, value.branchId, principal.userId);
    if (value.tableId) await this.tableAvailable(orm, value.branchId, value.tableId);
    const priced = await this.pricedItems(orm, value.branchId, value.items);
    if (value.discount > priced.subtotal)
      deny(400, 'DISCOUNT_INVALID', 'Giảm giá vượt tổng tiền món.');
    const order = await orm.Order.create({
      branchId: value.branchId,
      cashierId: principal.userId,
      shiftId: shift.id,
      orderType: value.orderType,
      orderingMode: value.orderingMode,
      tableId: value.tableId,
      status: 'OPEN',
      subtotal: priced.subtotal,
      discount: value.discount,
      total: priced.subtotal - value.discount,
      note: value.note || null,
      requestKey: value.requestKey,
      requestHash,
      revision: 1,
    });
    for (const row of priced.rows) await orm.OrderItem.create({ orderId: order.id, ...row });
    return this.orderView(orm, order.id, value.branchId);
  }
  async checkout(
    principal: SalesPrincipal,
    value: NewOrder,
    method: 'CASH' | 'BANK_TRANSFER',
    expectedTotal: number,
  ) {
    this.operational(principal, value.branchId);
    await this.branch(principal, value.branchId);
    if (value.paymentTiming !== 'NOW')
      deny(400, 'PAY_NOW_REQUIRED', 'Thanh toán ngay yêu cầu chế độ thu tiền ngay.');
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, value.branchId);
      const order = await this.createOrderInTransaction(tx, principal, value);
      if (!order) deny(503, 'ORDER_UNAVAILABLE', 'Không thể tải đơn vừa tạo.');
      if (order!.total !== expectedTotal)
        deny(409, 'TOTAL_CHANGED', 'Tổng tiền đã thay đổi. Hãy tải lại thực đơn và xác nhận lại.');
      return this.payOrderInTransaction(tx, principal, value.branchId, order!.id, method);
    });
  }
  async editOrder(principal: SalesPrincipal, branchId: string, id: string, value: EditOrder) {
    this.operational(principal, branchId);
    await this.branch(principal, branchId);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const order = await orm.Order.where({ id, branchId }).first();
      if (!order) deny(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      if (!openStatuses.includes(order!.status))
        deny(409, 'ORDER_CLOSED', 'Đơn đã thanh toán hoặc hủy, không thể sửa.');
      if (order!.revision !== value.revision)
        deny(409, 'ORDER_CHANGED', 'Đơn đã thay đổi ở thiết bị khác. Hãy tải lại.');
      await this.activeShift(orm, branchId, principal.userId);
      const priced = await this.pricedItems(orm, branchId, value.items);
      if (value.discount > priced.subtotal)
        deny(400, 'DISCOUNT_INVALID', 'Giảm giá vượt tổng tiền món.');
      await orm.OrderItem.where({ orderId: id }).deleteAll();
      for (const row of priced.rows) await orm.OrderItem.create({ orderId: id, ...row });
      await orm.Order.where({ id, branchId }).update({
        subtotal: priced.subtotal,
        discount: value.discount,
        total: priced.subtotal - value.discount,
        note: value.note || null,
        revision: value.revision + 1,
      });
      return this.orderView(orm, id, branchId);
    });
  }
  async payOrder(
    principal: SalesPrincipal,
    branchId: string,
    id: string,
    method: 'CASH' | 'BANK_TRANSFER',
  ) {
    this.operational(principal, branchId);
    await this.branch(principal, branchId);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      return this.payOrderInTransaction(tx, principal, branchId, id, method);
    });
  }
  private async payOrderInTransaction(
    tx: Tx,
    principal: SalesPrincipal,
    branchId: string,
    id: string,
    method: 'CASH' | 'BANK_TRANSFER',
  ) {
    const orm = tx.orm.public;
    const order = await this.orderView(orm, id, branchId);
    if (!order) deny(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    if (order!.status === 'PAID') {
      if (order!.payments.length === 1 && order!.payments[0].method === method) return order;
      deny(409, 'ALREADY_PAID', 'Đơn đã được thanh toán bằng phương thức khác.');
    }
    if (!openStatuses.includes(order!.status))
      deny(409, 'ORDER_CLOSED', 'Đơn không còn chờ thanh toán.');
    if (order!.payments.length)
      deny(
        409,
        'PAYMENT_INCONSISTENT',
        'Đơn đã có bản ghi thanh toán; cần kiểm tra trước khi tiếp tục.',
      );
    const shift = await this.activeShift(orm, branchId, principal.userId);
    await orm.OrderPayment.create({
      orderId: id,
      method,
      amount: order!.total,
      shiftId: shift.id,
      confirmedBy: principal.userId,
    });
    await orm.Order.where({ id, branchId }).update({
      status: 'PAID',
      revision: order!.revision + 1,
    });
    await salesTransaction.run(tx, () => notifyInventoryConsumption(id, principal.userId));
    return this.orderView(orm, id, branchId);
  }
  async cancelOrder(principal: SalesPrincipal, branchId: string, id: string) {
    this.operational(principal, branchId);
    await this.branch(principal, branchId);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const order = await orm.Order.where({ id, branchId }).first();
      if (!order) deny(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      if (order!.status === 'CANCELLED') return this.orderView(orm, id, branchId);
      if (!openStatuses.includes(order!.status))
        deny(409, 'ORDER_CLOSED', 'Không thể hủy đơn đã thanh toán.');
      await orm.Order.where({ id, branchId }).update({
        status: 'CANCELLED',
        revision: order!.revision + 1,
      });
      return this.orderView(orm, id, branchId);
    });
  }
  async transferOrder(principal: SalesPrincipal, branchId: string, id: string, tableId: string) {
    this.operational(principal, branchId);
    await this.branch(principal, branchId);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const order = await orm.Order.where({ id, branchId }).first();
      if (!order) deny(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      if (
        !openStatuses.includes(order!.status) ||
        order!.orderingMode !== 'TABLE' ||
        !order!.tableId
      )
        deny(409, 'TRANSFER_FORBIDDEN', 'Chỉ chuyển bàn cho đơn tại bàn chưa thanh toán.');
      if (order!.tableId === tableId) return this.orderView(orm, id, branchId);
      await this.tableAvailable(orm, branchId, tableId, id);
      await orm.Order.where({ id, branchId }).update({ tableId, revision: order!.revision + 1 });
      return this.orderView(orm, id, branchId);
    });
  }
  async listOrders(
    principal: SalesPrincipal,
    branchId: string,
    status: 'OPEN' | 'PAID' | 'CANCELLED',
    page: number,
    limit: number,
    search = '',
    dateFrom?: string,
    dateTo?: string,
  ) {
    await this.branch(principal, branchId);
    if (dateFrom && dateTo && dateFrom > dateTo)
      deny(400, 'INVALID_DATE_RANGE', 'Ngày bắt đầu không được sau ngày kết thúc.');
    if (search || dateFrom || dateTo) {
      if (search && !/^[0-9a-f-]+$/i.test(search))
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      const pattern = search ? `${search.toLowerCase()}%` : '%';
      const from = dateFrom
        ? new Date(`${dateFrom}T00:00:00+07:00`).toISOString()
        : '1970-01-01T00:00:00.000Z';
      const until = dateTo
        ? new Date(Date.parse(`${dateTo}T00:00:00+07:00`) + 86_400_000).toISOString()
        : '9999-12-31T00:00:00.000Z';
      const offset = (page - 1) * limit;
      const result = await this.database.transaction((tx) =>
        tx.query(
          this.database.raw.sql`
        WITH filtered AS (
          SELECT o.id, o."branchId", o."tableId", o."shiftId", o."cashierId", o."orderType", o.status, o.subtotal, o.discount, o.total, o.note, o."createdAt", o."updatedAt"
          FROM public."Order" o
          WHERE o."branchId" = ${branchId}::uuid AND lower(o.id::text) LIKE ${pattern}
            AND o."createdAt" >= ${from}::timestamptz AND o."createdAt" < ${until}::timestamptz
            AND ((${status} = 'OPEN' AND o.status IN ('OPEN','CONFIRMED')) OR (${status} <> 'OPEN' AND o.status = ${status}))
        ), page_rows AS (SELECT * FROM filtered ORDER BY "createdAt" DESC, id DESC LIMIT ${limit} OFFSET ${offset})
        SELECT json_build_object('rows', COALESCE((SELECT json_agg(page_rows) FROM page_rows), '[]'::json), 'total', (SELECT count(*) FROM filtered)) AS data
      `
            .returnsRow({ data: 'pg/json@1' })
            .build(),
        ),
      );
      const payload = result[0]?.data as { rows: unknown[]; total: number } | undefined;
      const total = payload?.total ?? 0;
      return {
        data: payload?.rows ?? [],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }
    const orm = this.database.orm.public;
    const query =
      status === 'OPEN'
        ? orm.Order.where({ branchId }).where((order) => order.status.in(['OPEN', 'CONFIRMED']))
        : orm.Order.where({ branchId, status });
    const { total } = await query.aggregate((agg) => ({ total: agg.count() }));
    const data = await query
      .orderBy((order) => order.createdAt.desc())
      .offset((page - 1) * limit)
      .limit(limit)
      .all();
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async getOrder(principal: SalesPrincipal, branchId: string, id: string) {
    await this.branch(principal, branchId);
    const order = await this.orderView(this.database.orm.public, id, branchId);
    if (!order) deny(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    return order;
  }
  async getOrderByRequestKey(principal: SalesPrincipal, branchId: string, requestKey: string) {
    await this.branch(principal, branchId);
    const row = await this.database.orm.public.Order.where({ branchId, requestKey })
      .select('id')
      .first();
    if (!row) deny(404, 'ORDER_NOT_FOUND', 'Chưa tìm thấy đơn cho yêu cầu này.');
    return this.orderView(this.database.orm.public, row!.id, branchId);
  }
  async catalog(principal: SalesPrincipal, branchId: string) {
    await this.branch(principal, branchId);
    const [rows, categories] = await Promise.all([
      this.database.orm.public.MenuItem.where({ branchId, isActive: true }).include('recipe').all(),
      this.database.orm.public.MenuCategory.where({ branchId }).select('id', 'name').all(),
    ]);
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      imageUrl: row.imageUrl,
      categoryId: row.categoryId,
      categoryName: categoryNames.get(row.categoryId) ?? 'Khác',
      modifiers:
        (row.recipe?.modifiers as unknown as
          { key: string; name: string; priceExtra: number }[] | undefined) ?? [],
    }));
  }
  async listTables(principal: SalesPrincipal, branchId: string) {
    await this.branch(principal, branchId);
    const orm = this.database.orm.public;
    const [areas, tables, open, confirmed] = await Promise.all([
      orm.RestaurantArea.where({ branchId }).all(),
      orm.RestaurantTable.where({ branchId }).all(),
      orm.Order.where({ branchId, status: 'OPEN' })
        .select('id', 'tableId', 'total', 'createdAt')
        .all(),
      orm.Order.where({ branchId, status: 'CONFIRMED' })
        .select('id', 'tableId', 'total', 'createdAt')
        .all(),
    ]);
    const active = [...open, ...confirmed];
    return {
      areas,
      tables: tables.map((table) => {
        const orders = active.filter((order) => order.tableId === table.id);
        return {
          ...table,
          effectiveStatus:
            !table.isActive || !areas.find((area) => area.id === table.areaId)?.isActive
              ? 'DISABLED'
              : orders.length
                ? 'OCCUPIED'
                : table.status === 'RESERVED' || table.status === 'CLEANING'
                  ? table.status
                  : 'AVAILABLE',
          currentOrder: orders[0] ?? null,
          inconsistent: orders.length > 1,
        };
      }),
    };
  }
  async createArea(principal: SalesPrincipal, branchId: string, name: string) {
    await this.branch(principal, branchId, true);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const areas = await orm.RestaurantArea.where({ branchId }).select('name').all();
      if (areas.some((area) => normalized(area.name) === normalized(name)))
        deny(409, 'AREA_EXISTS', 'Khu vực đã tồn tại.');
      return orm.RestaurantArea.create({
        branchId,
        name,
        isActive: true,
        displayOrder: areas.length,
      });
    });
  }
  async updateArea(
    principal: SalesPrincipal,
    branchId: string,
    id: string,
    value: { name?: string; isActive?: boolean },
  ) {
    await this.branch(principal, branchId, true);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const area = await orm.RestaurantArea.where({ id, branchId }).first();
      if (!area) deny(404, 'AREA_NOT_FOUND', 'Không tìm thấy khu vực.');
      if (value.name) {
        const areas = await orm.RestaurantArea.where({ branchId }).select('id', 'name').all();
        if (
          areas.some(
            (other) => other.id !== id && normalized(other.name) === normalized(value.name!),
          )
        )
          deny(409, 'AREA_EXISTS', 'Khu vực đã tồn tại.');
      }
      if (value.isActive === false) {
        const tables = await orm.RestaurantTable.where({ areaId: id, branchId }).select('id').all();
        for (const table of tables) {
          const orders = await orm.Order.where({ tableId: table.id, branchId })
            .select('status')
            .all();
          if (orders.some((order) => openStatuses.includes(order.status)))
            deny(409, 'AREA_OCCUPIED', 'Khu vực còn đơn tại bàn chưa thanh toán.');
        }
      }
      await orm.RestaurantArea.where({ id, branchId }).update(value);
      return orm.RestaurantArea.where({ id, branchId }).first();
    });
  }
  async createTable(
    principal: SalesPrincipal,
    branchId: string,
    value: { areaId: string; name: string; seats: number },
  ) {
    await this.branch(principal, branchId, true);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const area = await orm.RestaurantArea.where({
        id: value.areaId,
        branchId,
        isActive: true,
      }).first();
      if (!area) deny(404, 'AREA_NOT_FOUND', 'Khu vực không khả dụng.');
      const tables = await orm.RestaurantTable.where({ branchId, areaId: value.areaId })
        .select('name')
        .all();
      if (tables.some((table) => normalized(table.name) === normalized(value.name)))
        deny(409, 'TABLE_EXISTS', 'Tên bàn đã tồn tại trong khu vực.');
      return orm.RestaurantTable.create({
        branchId,
        ...value,
        status: 'AVAILABLE',
        isActive: true,
      });
    });
  }
  async updateTable(
    principal: SalesPrincipal,
    branchId: string,
    id: string,
    value: { name?: string; areaId?: string; seats?: number; isActive?: boolean },
  ) {
    await this.branch(principal, branchId, true);
    return this.database.transaction(async (tx) => {
      await this.lockBranch(tx, principal.businessId, branchId);
      const orm = tx.orm.public;
      const table = await orm.RestaurantTable.where({ id, branchId }).first();
      if (!table) deny(404, 'TABLE_NOT_FOUND', 'Không tìm thấy bàn.');
      const orders = await orm.Order.where({ tableId: id, branchId }).select('status').all();
      const occupied = orders.some((order) => openStatuses.includes(order.status));
      if (
        occupied &&
        (value.isActive === false || (value.areaId && value.areaId !== table!.areaId))
      )
        deny(409, 'TABLE_OCCUPIED', 'Bàn còn đơn chưa thanh toán.');
      const areaId = value.areaId ?? table!.areaId;
      const area = await orm.RestaurantArea.where({ id: areaId, branchId, isActive: true }).first();
      if (!area && value.isActive !== false)
        deny(409, 'AREA_UNAVAILABLE', 'Khu vực không khả dụng.');
      if (value.name || value.areaId) {
        const tables = await orm.RestaurantTable.where({ branchId, areaId })
          .select('id', 'name')
          .all();
        if (
          tables.some(
            (other) =>
              other.id !== id && normalized(other.name) === normalized(value.name ?? table!.name),
          )
        )
          deny(409, 'TABLE_EXISTS', 'Tên bàn đã tồn tại trong khu vực.');
      }
      await orm.RestaurantTable.where({ id, branchId }).update(value);
      return orm.RestaurantTable.where({ id, branchId }).first();
    });
  }
  async shiftSummary(principal: SalesPrincipal, branchId: string, shiftId: string) {
    await this.branch(principal, branchId);
    const orm = this.database.orm.public;
    const shift = await orm.Shift.where({ id: shiftId, branchId }).first();
    if (!shift || (principal.role === 'STAFF' && shift.staffId !== principal.userId))
      deny(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy ca làm việc.');
    const [orders, currentPayments, tables] = await Promise.all([
      orm.Order.where({ branchId, shiftId }).select('id', 'status', 'total', 'createdAt').all(),
      orm.OrderPayment.where({ shiftId })
        .select('orderId', 'method', 'amount', 'shiftId', 'createdAt')
        .all(),
      this.listTables(principal, branchId),
    ]);
    // Historical payments predate collection-shift tracking. Attribute only those
    // with no collection shift to their original order shift for compatibility.
    const orderIds = orders.filter((order) => order.status === 'PAID').map((order) => order.id);
    const historicalPayments = orderIds.length
      ? await orm.OrderPayment.where((payment) => payment.orderId.in(orderIds))
          .select('orderId', 'method', 'amount', 'shiftId', 'createdAt')
          .all()
      : [];
    const payments = [
      ...currentPayments,
      ...historicalPayments.filter((payment) => payment.shiftId === null),
    ];
    const paid = orders.filter((order) => order.status === 'PAID');
    const unpaid = orders.filter((order) => openStatuses.includes(order.status));
    return {
      shift,
      summary: {
        totalOrders: orders.length,
        paidOrders: paid.length,
        unpaidOrders: unpaid.length,
        cancelledOrders: orders.filter((order) => order.status === 'CANCELLED').length,
        collectedRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
        cashReceived: payments
          .filter((payment) => payment.method === 'CASH')
          .reduce((sum, payment) => sum + payment.amount, 0),
        bankTransferReceived: payments
          .filter((payment) => payment.method === 'BANK_TRANSFER')
          .reduce((sum, payment) => sum + payment.amount, 0),
        occupiedTables: tables.tables.filter((table) => table.effectiveStatus === 'OCCUPIED')
          .length,
      },
      recentTransactions: payments
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
        .map((payment) => ({
          orderId: payment.orderId,
          method: payment.method,
          amount: payment.amount,
          createdAt: payment.createdAt,
        })),
    };
  }
}
