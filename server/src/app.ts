import ownerRouter from './owner/ownerRouter.js';
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes.js';

import { authenticate } from './middleware/auth.js';
import { resolveMembership } from './middleware/membership.js';

import { createInventoryRouter } from './inventory/router.js';
import { InventoryService } from './inventory/service.js';
import { PrismaInventoryStore } from './inventory/prisma-store.js';
import { resolveInventoryPrincipal } from './inventory/principal.js';
import { readWorkspace, bootstrapWorkspace } from './inventory/workspace.js';

import menuRoutes from './modules/menu/menu.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import tablesRoutes from './modules/tables/tables.routes.js';
import shiftsRoutes from './modules/shifts/shifts.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

const inventoryService = new InventoryService(new PrismaInventoryStore());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'nextvn API is running',
  });
});

// Sales Operations routes
app.get('/api/business/:businessId/workspace', authenticate, resolveMembership, readWorkspace);
app.get('/api/workspace', authenticate, bootstrapWorkspace);
app.use('/api/business/:businessId/menu', menuRoutes);
app.use('/api/business/:businessId/orders', ordersRoutes);
app.use('/api/business/:businessId/tables', tablesRoutes);
app.use('/api/business/:businessId/shifts', shiftsRoutes);
app.use(
  '/api/business/:businessId/inventory',
  authenticate,
  resolveMembership,
  createInventoryRouter(inventoryService, resolveInventoryPrincipal),
);

app.use('/api/business/:businessId/owner', ownerRouter);

export default app;
