import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import quotationsRoutes from './routes/quotations.routes';
import productsRoutes from './routes/products.routes';
import warehousesRoutes from './routes/warehouses.routes';
import approvalsRoutes from './routes/approvals.routes';
import portalRoutes from './routes/portal.routes';
import dashboardRoutes from './routes/dashboard.routes';
import customersRoutes from './routes/customers.routes';

// Import error middleware
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Global middleware
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());

// Request logger middleware (method, path, status code, response time)
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customersRoutes);

// Centralized error handling middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 DealFlow360 server running on port ${PORT}`);
  });
}

export default app;
