import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import adminRoutes from './routes/admin.routes';
import principalRoutes from './routes/principal.routes';
import { getUploadsRoot } from './services/storage.service';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allows Web and Mobile clients
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded documents statically (PDFs & Photos)
const uploadsDirectory = getUploadsRoot();
app.use('/uploads', express.static(uploadsDirectory));

// Root & Health check endpoints
app.get('/api', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'College Student Verification Backend API',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      student: '/api/student',
      admin: '/api/admin',
    },
    cloud: 'Supabase PostgreSQL + Supabase Cloud Storage',
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'College Student Verification Backend API',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/principal', principalRoutes);

// Serve frontend static build in cloud / production mode
const candidatePaths = [
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'backend/public'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public'),
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(process.cwd(), 'web/dist'),
];

let resolvedStaticPath: string | null = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    resolvedStaticPath = p;
    break;
  }
}

if (resolvedStaticPath) {
  console.log(`[Frontend] Serving static admin web app from: ${resolvedStaticPath}`);
  app.use(express.static(resolvedStaticPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(resolvedStaticPath!, 'index.html'));
  });
} else {
  console.warn('[Frontend] No static web bundle found in candidate paths.');
}

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]', err);
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` College Verification API Server is running`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Static Uploads: ${uploadsDirectory}`);
  console.log(`====================================================`);
});

export default app;
