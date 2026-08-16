"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
let cached = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
    global.mongooseCache = cached;
}
// Setup connection lifecycle event listeners once
let listenersRegistered = false;
function registerConnectionListeners() {
    if (listenersRegistered)
        return;
    listenersRegistered = true;
    mongoose_1.default.connection.on('connected', () => {
        logger_1.default.info(`MongoDB connected successfully to host: ${mongoose_1.default.connection.host}`);
    });
    mongoose_1.default.connection.on('error', (err) => {
        logger_1.default.error(`MongoDB connection error: ${err.message}`);
    });
    mongoose_1.default.connection.on('disconnected', () => {
        logger_1.default.warn('MongoDB disconnected. Attempting reconnection when next request arrives.');
        cached.conn = null;
        cached.promise = null;
    });
    mongoose_1.default.connection.on('reconnected', () => {
        logger_1.default.info('MongoDB reconnected.');
    });
}
const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
        const errorMsg = 'MONGO_URI is not defined in the environment variables.';
        logger_1.default.error(errorMsg);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
        throw new Error(errorMsg);
    }
    // If already connected, return cached connection
    if (cached.conn && mongoose_1.default.connection.readyState === 1) {
        return cached.conn;
    }
    registerConnectionListeners();
    // If connection is already in progress, await the existing promise
    if (!cached.promise) {
        const connectionOptions = {
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
        logger_1.default.info('Connecting to MongoDB Atlas...');
        cached.promise = mongoose_1.default
            .connect(mongoURI, connectionOptions)
            .then((m) => {
            logger_1.default.info(`MongoDB Connected: ${m.connection.host} (Database: ${m.connection.name})`);
            return m;
        })
            .catch((err) => {
            logger_1.default.error(`MongoDB connection attempt failed: ${err.message}`);
            // Reset promise so subsequent requests can retry
            cached.promise = null;
            cached.conn = null;
            throw err;
        });
    }
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    }
    catch (error) {
        cached.promise = null;
        cached.conn = null;
        if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
            logger_1.default.error('Fatal database connection error. Exiting process...');
        }
        throw error;
    }
};
exports.connectDB = connectDB;
