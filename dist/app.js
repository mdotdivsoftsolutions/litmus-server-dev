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
const cors_2 = require("./config/cors");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./utils/logger"));
const db_1 = require("./config/db");
const errorHandler_1 = require("./middleware/errorHandler");
const ApiError_1 = require("./utils/ApiError");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)(cors_2.corsOptions));
// ── Raw body for Razorpay webhook (MUST be before express.json) ──────────────
// Razorpay webhook signature verification requires the raw request body.
// We apply express.raw() only to the webhook path; all other routes use JSON.
app.use((req, res, next) => {
    if (req.path === '/api/v1/payment/webhook' || req.path === '/api/v1/payments/webhook') {
        express_1.default.raw({ type: 'application/json' })(req, res, next);
    }
    else {
        express_1.default.json({ limit: '10mb' })(req, res, next);
    }
});
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
        next(new ApiError_1.ApiError(503, 'Database temporarily unavailable. Please try again shortly.'));
    }
});
// Swagger API Documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Routes
app.use('/api/v1', routes_1.default);
// Base route for testing / health check
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to Litmus API', status: 'operational' });
});
// Handle 404 for undefined routes
app.use((req, _res, next) => {
    next(new ApiError_1.ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
});
// Centralized Global Error Handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
