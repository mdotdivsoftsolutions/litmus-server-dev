import dotenv from 'dotenv';
// Load env vars before everything else
dotenv.config();

import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import logger from './utils/logger';
import { startUserStatusJob } from './jobs/userStatus.job';
import { initSocketServer } from './socket';

const PORT = process.env.PORT || 5000;

// Initialize Database connection
connectDB();

// Initialize cron jobs
startUserStatusJob();

// Create HTTP server for Express and Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO engine
initSocketServer(server);

// Only listen if not running on Vercel
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    logger.info(`API Docs available at http://localhost:${PORT}/api-docs`);
  });
}

// Export the Express API for Vercel
export default app;

