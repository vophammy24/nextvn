import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../prisma/db.js';
import { createAuthenticate } from '../middleware/auth.js';
import { createResolveMembership, type MemberRequest } from '../middleware/membership.js';
import { SalesService, type SalesPrincipal } from './service.js';
import { InventoryError } from '../inventory/domain.js';
import {
  SalesError,
  parse,
  uuid,
  settingsInput,
  orderInput,
  checkoutInput,
  editInput,
  payInput,
  transferInput,
  areaInput,
  tableInput,
  nameInput,
} from './domain.js';

type Database = typeof db;
const param = (value: string | string[] | undefined) =>
  parse(uuid, Array.isArray(value) ? value[0] : value);
const areaUpdate = z
  .object({ name: nameInput.optional(), isActive: z.boolean().optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const tableUpdate = z
  .object({
    name: nameInput.optional(),
    areaId: uuid.optional(),
    seats: z.number().int().positive().max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const listQuery = z.object({
  status: z.enum(['OPEN', 'PAID', 'CANCELLED']).default('OPEN'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(36).default(''),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

export function createSalesRouter(
  options: {
    database?: Database;
    authenticate?: ReturnType<typeof createAuthenticate>;
    resolveMembership?: ReturnType<typeof createResolveMembership>;
  } = {},
) {
  const database = options.database ?? db;
  const service = new SalesService(database);
  const router = Router({ mergeParams: true });
  router.use(
    options.authenticate ?? createAuthenticate(database),
    options.resolveMembership ?? createResolveMembership(database),
  );
  const principal = (req: Request): SalesPrincipal => {
    const member = req as MemberRequest;
    return {
      userId: member.user.userId,
      businessId: member.membership.businessId,
      branchId: member.membership.branchId,
      role: member.membership.role,
    };
  };
  const run =
    (
      handler: (
        req: Request,
        res: Response,
        principal: SalesPrincipal,
        branchId: string,
      ) => Promise<unknown>,
      created = false,
    ) =>
    async (req: Request, res: Response) => {
      try {
        const result = await handler(req, res, principal(req), param(req.params.branchId));
        res.status(created ? 201 : 200).json({ success: true, data: result });
      } catch (error) {
        if (error instanceof SalesError)
          res.status(error.status).json({ code: error.code, message: error.message });
        else if (error instanceof InventoryError)
          res.status(error.status).json({ code: error.code, message: error.message });
        else
          res.status(503).json({
            code: 'SALES_UNAVAILABLE',
            message: 'Không thể xử lý bán hàng. Vui lòng thử lại.',
          });
      }
    };
  router.get(
    '/:branchId/settings',
    run((_req, _res, user, branch) => service.getSettings(user, branch)),
  );
  router.get(
    '/:branchId/catalog',
    run((_req, _res, user, branch) => service.catalog(user, branch)),
  );
  router.put(
    '/:branchId/settings',
    run((req, _res, user, branch) =>
      service.updateSettings(user, branch, parse(settingsInput, req.body)),
    ),
  );
  router.get(
    '/:branchId/areas',
    run(async (_req, _res, user, branch) => (await service.listTables(user, branch)).areas),
  );
  router.post(
    '/:branchId/areas',
    run(
      (req, _res, user, branch) =>
        service.createArea(user, branch, parse(areaInput, req.body).name),
      true,
    ),
  );
  router.patch(
    '/:branchId/areas/:id',
    run((req, _res, user, branch) =>
      service.updateArea(user, branch, param(req.params.id), parse(areaUpdate, req.body)),
    ),
  );
  router.get(
    '/:branchId/tables',
    run(async (_req, _res, user, branch) => (await service.listTables(user, branch)).tables),
  );
  router.post(
    '/:branchId/tables',
    run(
      (req, _res, user, branch) => service.createTable(user, branch, parse(tableInput, req.body)),
      true,
    ),
  );
  router.patch(
    '/:branchId/tables/:id',
    run((req, _res, user, branch) =>
      service.updateTable(user, branch, param(req.params.id), parse(tableUpdate, req.body)),
    ),
  );
  router.get(
    '/:branchId/orders',
    run((req, _res, user, branch) => {
      const q = parse(listQuery, req.query);
      return service.listOrders(user, branch, q.status, q.page, q.limit, q.q, q.dateFrom, q.dateTo);
    }),
  );
  router.post(
    '/:branchId/orders',
    run((req, _res, user, branch) => {
      const value = parse(orderInput, req.body);
      if (value.branchId !== branch)
        throw new SalesError(403, 'BRANCH_MISMATCH', 'Chi nhánh không khớp đường dẫn.');
      return service.createOrder(user, value);
    }, true),
  );
  router.post(
    '/:branchId/checkout',
    run((req, _res, user, branch) => {
      const value = parse(checkoutInput, req.body);
      if (value.branchId !== branch)
        throw new SalesError(403, 'BRANCH_MISMATCH', 'Chi nhánh không khớp đường dẫn.');
      const { method, expectedTotal, confirmed: _confirmed, ...order } = value;
      void _confirmed;
      return service.checkout(user, order, method, expectedTotal);
    }, true),
  );
  router.get(
    '/:branchId/orders/request/:key',
    run((req, _res, user, branch) =>
      service.getOrderByRequestKey(user, branch, param(req.params.key)),
    ),
  );
  router.get(
    '/:branchId/orders/:id',
    run((req, _res, user, branch) => service.getOrder(user, branch, param(req.params.id))),
  );
  router.patch(
    '/:branchId/orders/:id',
    run((req, _res, user, branch) =>
      service.editOrder(user, branch, param(req.params.id), parse(editInput, req.body)),
    ),
  );
  router.post(
    '/:branchId/orders/:id/pay',
    run((req, _res, user, branch) => {
      const value = parse(payInput, req.body);
      return service.payOrder(user, branch, param(req.params.id), value.method);
    }),
  );
  router.post(
    '/:branchId/orders/:id/cancel',
    run((req, _res, user, branch) => service.cancelOrder(user, branch, param(req.params.id))),
  );
  router.post(
    '/:branchId/orders/:id/transfer',
    run((req, _res, user, branch) =>
      service.transferOrder(
        user,
        branch,
        param(req.params.id),
        parse(transferInput, req.body).tableId,
      ),
    ),
  );
  router.get(
    '/:branchId/shifts/:id/summary',
    run((req, _res, user, branch) => service.shiftSummary(user, branch, param(req.params.id))),
  );
  return router;
}
