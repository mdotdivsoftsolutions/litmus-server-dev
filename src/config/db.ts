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

  // 1. If already connected, return immediately (prevents duplicate connections)
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return mongoose;
  }

  registerConnectionListeners();

  // 2. If connection is already in progress, await the existing promise
  if (mongoose.connection.readyState === 2 && cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // 3. If no connection or previous promise failed, initiate a new connection with optimal pooling
  if (!cached.promise) {
    const isServerless = Boolean(process.env.VERCEL);
    const connectionOptions: mongoose.ConnectOptions = {
      // Prevents driver from hanging during connection/DNS issues
      serverSelectionTimeoutMS: 8000,
      // Initial socket connection timeout
      connectTimeoutMS: 10000,
      // Close sockets after 45s of query inactivity
      socketTimeoutMS: 45000,
      // Automatically release idle connections after 20s to stay well below Atlas M0 connection limits
      maxIdleTimeMS: 20000,
      // Optimal connection pool for M0 Free Tier (prevents connection exhaustion)
      maxPoolSize: isServerless ? 3 : 5,
      // Allow pool to scale down to 0 idle connections when traffic is low
      minPoolSize: 0,
      // Check connection health every 10s to prune dead sockets
      heartbeatFrequencyMS: 10000,
      // Enable automatic index building in development, disable in production for performance
      autoIndex: process.env.NODE_ENV !== 'production',
    };

    logger.info('Connecting to MongoDB Atlas with optimized connection pooling...');
    cached.promise = mongoose
      .connect(mongoURI, connectionOptions)
      .then((m) => {
        logger.info(`MongoDB Connected: ${m.connection.host} (Database: ${m.connection.name})`);
        cached.conn = m;
        return m;
      })
      .catch((err) => {
        logger.error(`MongoDB connection attempt failed: ${err.message}`);
        // Reset promise so subsequent requests can retry cleanly
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
