"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load env vars before everything else
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const logger_1 = __importDefault(require("./utils/logger"));
const userStatus_job_1 = require("./jobs/userStatus.job");
const abandonedCart_job_1 = require("./jobs/abandonedCart.job");
const socket_1 = require("./socket");
const PORT = process.env.PORT || 5000;
// Initialize Database connection
(0, db_1.connectDB)();
// Initialize cron jobs
(0, userStatus_job_1.startUserStatusJob)();
(0, abandonedCart_job_1.startAbandonedCartJob)();
// Create HTTP server for Express and Socket.IO
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.IO engine
(0, socket_1.initSocketServer)(server);
// Only listen if not running on Vercel
if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        logger_1.default.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        logger_1.default.info(`API Docs available at http://localhost:${PORT}/api-docs`);
    });
}
// Export the Express API for Vercel
exports.default = app_1.default;
