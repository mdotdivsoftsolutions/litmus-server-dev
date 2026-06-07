# Litmus Backend Server

This is the backend server for the Litmus application, built with Node.js, Express, and TypeScript. It provides a robust API with features including authentication, file storage, payment processing, and email notifications.

## 🚀 Tech Stack

- **Framework:** Node.js + Express
- **Language:** TypeScript
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt
- **Storage:** DigitalOcean Spaces (S3 compatible) via `@aws-sdk/client-s3`
- **Payments:** Razorpay
- **Emails:** Nodemailer
- **API Documentation:** Swagger UI

## 📋 Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)

## 🛠️ Installation & Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/mdotdivsoftsolutions/litmus-server-dev.git
   cd litmus-server-dev
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root of the backend directory and copy the contents from your environment setup. At a minimum, you'll need to configure:
   - MongoDB Connection string (`MONGO_URI`)
   - JWT Secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
   - DigitalOcean Spaces config (`DO_SPACES_ENDPOINT`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_NAME`, `DO_SPACES_REGION`)
   - SMTP Configuration for Emails
   - Razorpay Keys (if payments are active)

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The server will start (typically on `http://localhost:5000` depending on your `.env` `PORT`).

## 📜 Available Scripts

- `npm run dev`: Starts the server in development mode using `ts-node-dev` with hot reloading.
- `npm run build`: Compiles the TypeScript source code into the `dist` directory.
- `npm run start`: Runs the compiled JavaScript application from the `dist` folder.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/        # Environment and 3rd party service configurations (e.g., S3/Spaces, DB)
│   ├── controllers/   # Request handlers and business logic
│   ├── middleware/    # Express middlewares (Auth, Error handling, etc.)
│   ├── models/        # Mongoose database schemas
│   ├── routes/        # API route definitions
│   ├── utils/         # Helper functions and utilities
│   └── server.ts      # Application entry point
├── dist/              # Compiled output (generated after build)
├── .env               # Environment variables (ignored in git)
├── package.json       # Project dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

## 🔐 Authentication

This project uses standard JWT access and refresh tokens. Make sure your client application sends the `Authorization: Bearer <token>` header for protected routes.

## 🗄️ File Storage

File uploads are handled via `multer` (in-memory) and uploaded directly to **DigitalOcean Spaces** via the AWS SDK v3.

## 📄 API Documentation

If Swagger is configured, you can view the interactive API documentation by navigating to the designated swagger route (e.g., `/api-docs`).
