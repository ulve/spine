import prisma from './db.js';
import { ScannerService } from './scanner/ScannerService.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './api/routes.js';
import opdsRoutes from './api/opds.js';
import authRoutes from './api/auth.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const scanner = new ScannerService();
const app = express();
const PORT = process.env.PORT || 3000;
const COVERS_DIR = process.env.COVERS_DIR || '/app/data/covers';

async function main() {
  // 1. Logging Middleware (Top priority)
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
  });

  console.log('Starting eBook Server Backend...');

  // 2. Base Middleware
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, same-origin in production)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }));
  app.use(express.json());

  // Ensure DB is connected
  try {
    await prisma.$connect();
    console.log('Connected to database.');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }

  // Initialize scanner
  await scanner.init();

  // Serve covers
  app.use('/api/covers', express.static(COVERS_DIR));

  // API Routes
  app.use('/api', apiRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/opds', opdsRoutes);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[GlobalError]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // Serve static frontend in production
  if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.resolve(__dirname, '../frontend/dist');
    console.log(`Serving frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    // Handle SPA routing - serve index.html for all non-API routes
    app.get('*any', (req, res) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/opds')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  // Start Express Server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // Run initial scan
  console.log('Running initial scan...');
  await scanner.scan();

  // Start watching for changes
  scanner.watch();

  console.log('Backend and Scanner are running.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
