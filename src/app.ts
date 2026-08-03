import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import apiRoutes from './routes';
import logger from './utils/logger';

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
    process.env.FRONTEND_URL || '' // Adds your production domain from .env
  ],
  credentials: true,
}));
app.use(express.json());
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

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1', apiRoutes);

// Base route for testing
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to Litmus API' });
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
