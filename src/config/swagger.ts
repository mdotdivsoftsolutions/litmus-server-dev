import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';

const siteUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const options: swaggerJSDoc.Options = {
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
    path.join(__dirname, '../routes/*.[jt]s'),
    path.join(__dirname, '../models/*.[jt]s'),
    './src/routes/*.ts',
    './src/models/*.ts',
    './dist/routes/*.js',
    './dist/models/*.js',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
