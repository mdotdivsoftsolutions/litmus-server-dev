"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load env vars before everything else
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const logger_1 = __importDefault(require("./utils/logger"));
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        // Connect to Database
        await (0, db_1.connectDB)();
        app_1.default.listen(PORT, () => {
            logger_1.default.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            logger_1.default.info(`API Docs available at http://localhost:${PORT}/api-docs`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server', error);
        process.exit(1);
    }
};
startServer();
