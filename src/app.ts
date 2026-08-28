import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { corsOptions } from './config/cors';
import apiRoutes from './routes';
import logger from './utils/logger';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { ApiError } from './utils/ApiError';

const app: Application = express();

// Middlewares
app.use(cors(corsOptions));

// ── Raw body for Razorpay webhook (MUST be before express.json) ──────────────
// Razorpay webhook signature verification requires the raw request body.
// We apply express.raw() only to the webhook path; all other routes use JSON.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/v1/payment/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    next(new ApiError(503, 'Database temporarily unavailable. Please try again shortly.'));
  }
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1', apiRoutes);

// Base route for testing / health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to Litmus API', status: 'operational' });
});

// Handle 404 for undefined routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized Global Error Handler
app.use(errorHandler);

export default app;

