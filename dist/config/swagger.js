"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const path_1 = __importDefault(require("path"));
const siteUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Litmus API Documentation',
            version: '1.0.0',
            description: 'API documentation for the Litmus Food Lab Testing Web Application',
        },
        servers: [
            {
                url: siteUrl,
                description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT access token to authenticate API requests',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        path_1.default.join(__dirname, '../routes/*.[jt]s'),
        path_1.default.join(__dirname, '../models/*.[jt]s'),
        './src/routes/*.ts',
        './src/models/*.ts',
        './dist/routes/*.js',
        './dist/models/*.js',
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
