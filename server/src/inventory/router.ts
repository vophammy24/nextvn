import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { InventoryError, parse, type Principal } from './domain.js';
import type { InventoryService } from './service.js';
export type ResolveInventoryPrincipal = (req: Request, res: Response) => Promise<Principal | null>;
// Member 1 supplies this adapter AFTER verifying session + business membership + branch grants.
// No role/business identity is accepted from request headers, query, or body.
export function createInventoryRouter(
  service: InventoryService,
  resolvePrincipal: ResolveInventoryPrincipal = async () => null,
) {
  const router = Router();
  router.use(async (req, res, next) => {
    try {
      const principal = await resolvePrincipal(req, res);
      if (!principal)
        throw new InventoryError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
      res.locals.inventoryPrincipal = principal;
      next();
    } catch {
      res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập để tiếp tục.' });
    }
  });
  router.get('/summary', async (_req, res, next) => {
    try {
      res.json(await service.ownerSummary(res.locals.inventoryPrincipal));
    } catch (error) {
      next(error);
    }
  });
  router.use('/branches/:branchId', async (req, res, next) => {
    try {
      res.locals.inventoryScope = {
        businessId: res.locals.inventoryPrincipal.businessId,
        branchId: parse(z.uuid('Chi nhánh không hợp lệ.'), req.params.branchId),
      };
      next();
    } catch (error) {
      next(error);
    }
  });
  router.get('/branches/:branchId', async (_req, res, next) => {
    try {
      res.json(await service.read(res.locals.inventoryPrincipal, res.locals.inventoryScope));
    } catch (error) {
      next(error);
    }
  });
  router.post('/branches/:branchId/ingredients', async (req, res, next) => {
    try {
      res
        .status(201)
        .json(
          await service.saveIngredient(
            res.locals.inventoryPrincipal,
            res.locals.inventoryScope,
            req.body,
          ),
        );
    } catch (error) {
      next(error);
    }
  });
  router.patch('/branches/:branchId/ingredients/:id', async (req, res, next) => {
    try {
      res.json(
        await service.saveIngredient(
          res.locals.inventoryPrincipal,
          res.locals.inventoryScope,
          req.body,
          parse(z.uuid('Mã định danh không hợp lệ.'), req.params.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  });
  router.post('/branches/:branchId/transactions', async (req, res, next) => {
    try {
      res
        .status(201)
        .json(
          await service.transact(
            res.locals.inventoryPrincipal,
            res.locals.inventoryScope,
            req.body,
          ),
        );
    } catch (error) {
      next(error);
    }
  });
  router.post('/branches/:branchId/recipes', async (req, res, next) => {
    try {
      res
        .status(201)
        .json(
          await service.saveRecipe(
            res.locals.inventoryPrincipal,
            res.locals.inventoryScope,
            req.body,
          ),
        );
    } catch (error) {
      next(error);
    }
  });
  router.put('/branches/:branchId/recipes/:id', async (req, res, next) => {
    try {
      res.json(
        await service.saveRecipe(
          res.locals.inventoryPrincipal,
          res.locals.inventoryScope,
          req.body,
          parse(z.uuid('Mã định danh không hợp lệ.'), req.params.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  });
  router.patch('/branches/:branchId/alerts/:id', async (req, res, next) => {
    try {
      const { status } = parse(
        z.object({
          status: z.enum(['IN_PROGRESS', 'RESOLVED'], { error: 'Trạng thái không hợp lệ.' }),
        }),
        req.body,
      );
      res.json(
        await service.setAlertStatus(
          res.locals.inventoryPrincipal,
          res.locals.inventoryScope,
          parse(z.uuid('Mã định danh không hợp lệ.'), req.params.id),
          status,
        ),
      );
    } catch (error) {
      next(error);
    }
  });
  router.use((error: unknown, _req: Request, res: Response, _next: (error?: unknown) => void) => {
    if (error instanceof InventoryError)
      res.status(error.status).json({ code: error.code, message: error.message });
    else
      res.status(503).json({
        code: 'INVENTORY_UNAVAILABLE',
        message: 'Không thể xử lý dữ liệu kho. Vui lòng thử lại.',
      });
  });
  return router;
}
