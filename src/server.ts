// Handle uncaught exceptions before loading app dependencies
process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err.name, err.message, err.stack);
  process.exit(1);
});

import dotenv from 'dotenv';
// Load env vars before everything else
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import { connectDB } from './config/db';
import logger from './utils/logger';
import { startUserStatusJob } from './jobs/userStatus.job';
import { startAbandonedCartJob } from './jobs/abandonedCart.job';
import { initSocketServer } from './socket';

const PORT = process.env.PORT || 5000;

// Initialize Database connection
connectDB();

// Initialize cron jobs
startUserStatusJob();
startAbandonedCartJob();

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

// Graceful shutdown to prevent orphaned connections on MongoDB Atlas
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully closing HTTP server and database connections...`);
  server.close(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed cleanly.');
      }
    } catch (err: any) {
      logger.error(`Error during database disconnection: ${err.message}`);
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ts-node-dev / nodemon restart signal
process.once('SIGUSR2', async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }
  } catch {
    // Ignore error on restart
  } finally {
    process.kill(process.pid, 'SIGUSR2');
  }
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err: any) => {
  logger.error(`UNHANDLED REJECTION! 💥 ${err?.message || err}`);
  server.close(() => {
    process.exit(1);
  });
});

// Export the Express API for Vercel
export default app;


