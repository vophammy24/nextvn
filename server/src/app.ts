import express from 'express';
import cors from 'cors';

import menuRoutes from './modules/menu/menu.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import tablesRoutes from './modules/tables/tables.routes.js';
import shiftsRoutes from './modules/shifts/shifts.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'nextvn API is running',
  });
});

// Sales Operations routes
app.use('/api/business/:businessId/menu', menuRoutes);
app.use('/api/business/:businessId/orders', ordersRoutes);
app.use('/api/business/:businessId/tables', tablesRoutes);
app.use('/api/business/:businessId/shifts', shiftsRoutes);

export default app;
