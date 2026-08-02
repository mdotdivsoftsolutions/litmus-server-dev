import dotenv from 'dotenv';
// Load env vars before everything else
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import logger from './utils/logger';
import { startUserStatusJob } from './jobs/userStatus.job';

const PORT = process.env.PORT || 5000;

// Initialize Database connection
connectDB();

// Initialize cron jobs
startUserStatusJob();

// Only listen if not running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    logger.info(`API Docs available at http://localhost:${PORT}/api-docs`);
  });
}

// Export the Express API for Vercel
export default app;
