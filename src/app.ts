import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import apiRoutes from './routes';
import logger from './utils/logger';
import { connectDB } from './config/db';

const app: Application = express();

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'https://litmus-frontend-dev.vercel.app',
    'https://litmus-user-frontend-dev-beta.vercel.app',
    'https://litmus-lab-frontend-dev.vercel.app',
    'https://litmus-user-frontend.vercel.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
}));

// ── Raw body for Razorpay webhook (MUST be before express.json) ──────────────
// Razorpay webhook signature verification requires the raw request body.
// We apply express.raw() only to the webhook path; all other routes use JSON.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/v1/payment/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Request logging with Morgan and Winston
const morganFormat = process.env.NODE_ENV !== 'production' ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Database connection assurance middleware (vital for Serverless cold-starts & connection drops)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Skip DB connection check for docs and health check root
  if (req.path === '/' || req.path.startsWith('/api-docs')) {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (error: any) {
    logger.error(`Database connection middleware error: ${error.message}`);
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again shortly.',
    });
  }
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1', apiRoutes);

// Base route for testing
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to Litmus API', status: 'operational' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

export default app;
