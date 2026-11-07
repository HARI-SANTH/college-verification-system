import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
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

// Health check endpoint
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
