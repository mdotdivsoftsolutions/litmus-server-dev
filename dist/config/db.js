"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
const connectDB = async () => {
    try {
        if (mongoose_1.default.connection.readyState >= 1) {
            return;
        }
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI) {
            logger_1.default.error('MONGO_URI is not defined in the environment variables.');
            if (!process.env.VERCEL)
                process.exit(1);
            return;
        }
        const conn = await mongoose_1.default.connect(mongoURI);
        logger_1.default.info(`MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        logger_1.default.error(`Error connecting to MongoDB: ${error.message}`);
        if (!process.env.VERCEL)
            process.exit(1);
    }
};
exports.connectDB = connectDB;
