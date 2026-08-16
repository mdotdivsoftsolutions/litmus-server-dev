import mongoose from 'mongoose';
import logger from '../utils/logger';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cache to prevent multiple connections in serverless / hot-reload environments
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// Setup connection lifecycle event listeners once
let listenersRegistered = false;
function registerConnectionListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    logger.info(`MongoDB connected successfully to host: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting reconnection when next request arrives.');
    cached.conn = null;
    cached.promise = null;
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected.');
  });
}

export const connectDB = async (): Promise<typeof mongoose> => {
  const mongoURI = process.env.MONGO_URI as string;

  if (!mongoURI) {
    const errorMsg = 'MONGO_URI is not defined in the environment variables.';
    logger.error(errorMsg);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }

  // If already connected, return cached connection
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  registerConnectionListeners();

  // If connection is already in progress, await the existing promise
  if (!cached.promise) {
    const connectionOptions: mongoose.ConnectOptions = {
      // Prevents driver from hanging for 30s during connection/DNS issues
      serverSelectionTimeoutMS: 8000,
      // Initial socket connection timeout
      connectTimeoutMS: 10000,
      // Close sockets after 45s of inactivity
      socketTimeoutMS: 45000,
      // Maintain optimal connection pool
      maxPoolSize: 10,
      minPoolSize: 1,
      // Check connection health every 10s to prune dead sockets
      heartbeatFrequencyMS: 10000,
      // Enable automatic index building in development, disable in production for performance
      autoIndex: process.env.NODE_ENV !== 'production',
    };

    logger.info('Connecting to MongoDB Atlas...');
    cached.promise = mongoose
      .connect(mongoURI, connectionOptions)
      .then((m) => {
        logger.info(`MongoDB Connected: ${m.connection.host} (Database: ${m.connection.name})`);
        return m;
      })
      .catch((err) => {
        logger.error(`MongoDB connection attempt failed: ${err.message}`);
        // Reset promise so subsequent requests can retry
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error: any) {
    cached.promise = null;
    cached.conn = null;
    if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
      logger.error('Fatal database connection error. Exiting process...');
    }
    throw error;
  }
};
