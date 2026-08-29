import { CorsOptions } from 'cors';

export const ALLOWED_ORIGINS = [
  'http://localhost:5173',//LOCAL Host
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
  'https://litmus-frontend-dev.vercel.app',//DEV Domain
  'https://litmus-user-frontend-dev-beta.vercel.app',
  'https://litmus-lab-frontend-dev.vercel.app',
  'https://litmus-user-frontend.vercel.app',
  'https://admin.dev.litmuslabs.in',//DEV Domain
  'https://lab.dev.litmuslabs.in',
  'https://app.dev.litmuslabs.in',
  'https://admin.qa.litmuslabs.in',//QA Domain
  'https://lab.qa.litmuslabs.in',
  'https://app.qa.litmuslabs.in',
  'https://litmuslabs.in',//PROD domains
  'https://www.litmuslabs.in',
  'https://app.litmuslabs.in',
  'https://admin.litmuslabs.in',
  'https://lab.litmuslabs.in',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching allowed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' is not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
