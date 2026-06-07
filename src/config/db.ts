import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }

    const mongoURI = process.env.MONGO_URI as string;
    
    if (!mongoURI) {
      logger.error('MONGO_URI is not defined in the environment variables.');
      if (!process.env.VERCEL) process.exit(1);
      return;
    }

    const conn = await mongoose.connect(mongoURI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    if (!process.env.VERCEL) process.exit(1);
  }
};
