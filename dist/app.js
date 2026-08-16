"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./utils/logger"));
const db_1 = require("./config/db");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
        'https://litmus-frontend-dev.vercel.app',
        'https://litmus-user-frontend-dev-beta.vercel.app',
        'https://litmus-lab-frontend-dev.vercel.app',
        'https://litmus-user-frontend.vercel.app',
        process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Request logging with Morgan and Winston
const morganFormat = process.env.NODE_ENV !== 'production' ? 'dev' : 'combined';
app.use((0, morgan_1.default)(morganFormat, {
    stream: {
        write: (message) => logger_1.default.info(message.trim()),
    },
}));
// Database connection assurance middleware (vital for Serverless cold-starts & connection drops)
app.use(async (req, res, next) => {
    // Skip DB connection check for docs and health check root
    if (req.path === '/' || req.path.startsWith('/api-docs')) {
        return next();
    }
    try {
        await (0, db_1.connectDB)();
        next();
    }
    catch (error) {
        logger_1.default.error(`Database connection middleware error: ${error.message}`);
        res.status(503).json({
            success: false,
            message: 'Database temporarily unavailable. Please try again shortly.',
        });
    }
});
// Swagger API Documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Routes
app.use('/api/v1', routes_1.default);
// Base route for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to Litmus API', status: 'operational' });
});
// Global Error Handler
app.use((err, req, res, next) => {
    logger_1.default.error(`Error: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Server Error',
    });
});
exports.default = app;
