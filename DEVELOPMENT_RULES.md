# Litmus Backend Development Rules & Architecture Standards

This document establishes the mandatory development standards for the Litmus backend codebase. All future feature additions, bug fixes, refactors, and pull requests **must strictly adhere** to these rules.

---

## 1. Folder Structure & File Organization

Organize all code under `src/` into strict single-responsibility layers:

```
src/
├── config/             # Environment configs (db.ts, cors.ts, swagger.ts)
├── constants/          # Application constants, Enums, Socket event names
├── controllers/        # Express request/response coordinators only (<300 lines)
│   └── admin/          # Modular domain sub-controllers (adminUser, adminBooking, etc.)
├── jobs/               # Scheduled node-cron background workers
├── middleware/         # Auth, validation, rate-limiting, error-handling middleware
├── models/             # Mongoose schemas with compound indexes & TypeScript types
├── routes/             # Express routers with Swagger (@swagger) annotations
├── services/           # Reusable business logic & database queries
├── socket/             # Socket.io handlers & Redis cluster adapter
├── templates/          # Email layout engines and rendered HTML templates
│   └── email/          # Reusable email templates (emailLayout, authTemplates, etc.)
├── types/              # Centralized TypeScript interface definitions
├── utils/              # Pure utility functions (ApiError, ApiResponse, mailer, logger)
└── validators/         # Zod request validation schemas
tests/                  # Vitest unit & integration test suites (*.spec.ts)
```

---

## 2. Naming Conventions

- **File Names:** Use **`camelCase`** followed by the layer suffix.
  - Controllers: `labEmployee.controller.ts`, `platformSettings.controller.ts`
  - Routes: `labEmployee.routes.ts`, `bulkImport.routes.ts`
  - Services: `auth.service.ts`, `chat.service.ts`
  - Middleware: `errorHandler.ts`, `rateLimiter.ts`, `auth.middleware.ts`
  - Validators: `auth.validator.ts`, `booking.validator.ts`
  - Models: **`PascalCase`** (e.g., `Booking.ts`, `User.ts`, `Laboratory.ts`)
- **Route Endpoints:** Use **plural REST resource names** (e.g., `/api/v1/bookings`, `/api/v1/payments`, `/api/v1/packages`).
- **Classes:** `PascalCase` (e.g., `AuthService`, `ApiError`, `ApiResponse`).
- **Functions & Variables:** `camelCase` (e.g., `sendOtpEmail`, `getLabForRequest`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PAGINATION`, `SOCKET_EVENTS`).

---

## 3. File & Function Size Limits (Maintainability)

- **Max File Size:** Maximum **300–350 lines** per file.
- When a controller grows large (like `admin.controller.ts`), decompose it into domain sub-controllers under a subfolder (e.g., `src/controllers/admin/adminBooking.controller.ts`) and provide a clean barrel re-export.
- Extract large HTML strings or email templates into `src/templates/email/` rather than inlining them inside utility/service functions.

---

## 4. Controller vs. Service Separation (Clean Architecture)

- **Controllers MUST NOT execute direct Mongoose queries** (`Model.find`, `Model.findById`, `Model.findOneAndUpdate`).
- Controllers only handle:
  1. Extracting parameters (`req.params`, `req.query`, `req.body`, `req.user`).
  2. Calling the appropriate `Service` method.
  3. Returning standardized `ApiResponse` envelopes or delegating errors to `next(error)` / `ApiError`.
- **Services MUST NOT access Express objects** (`req`, `res`, `next`). Services should be pure, reusable across REST routes, Socket.io events, CLI scripts, and cron background jobs.

---

## 5. Standardized API Responses & Error Handling

- **Success Envelope:** Always wrap successful responses using standard structure:
  ```json
  {
    "success": true,
    "message": "Resource retrieved successfully",
    "data": { ... },
    "pagination": { "page": 1, "limit": 10, "total": 45, "pages": 5 }
  }
  ```
  *(Use `ApiResponse.success(res, data, message, statusCode, meta)` or `ApiResponse.paginated()`)*
- **Operational Errors:** Throw `ApiError` instances with HTTP status codes:
  ```typescript
  throw ApiError.badRequest('Invalid booking transition');
  throw ApiError.notFound('Laboratory not found');
  throw ApiError.unauthorized('Invalid access token');
  ```
- **Async Safety:** Wrap controller actions in `asyncHandler` or centralized `errorHandler` middleware to eliminate unhandled promise rejections.

---

## 6. Mandatory Swagger / OpenAPI Documentation

Every time a new API route or endpoint is added or modified:
1. **MUST include `@swagger` JSDoc comments** directly above the route definition in `src/routes/*.routes.ts`.
2. Must specify:
   - Route path, HTTP method, summary, and category tag.
   - Required security schemes (`bearerAuth`).
   - Query parameters, path parameters, or request body schema.
   - Standard 200/201 response and error responses (400, 401, 404).

**Example Template:**
```typescript
/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Retrieve a single product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProductById);
```

---

## 7. Database & Indexing Rules

- Always index fields frequently used in filtering, sorting, or lookups (`status`, `createdAt`, `userId`, `labId`).
- **Avoid Duplicate Index Warnings:** If a field is already the prefix of a compound index (e.g. `Schema.index({ userId: 1, createdAt: -1 })`), **do NOT** declare `userId: { index: true }` on the property schema.
- For high-volume multi-field queries, use compound indexes with the equality fields first, then range/sort fields.

---

## 8. Security & Environment Safeguards

- **Never Commit Credentials:** Never put real secrets, database URIs, API keys, or WhatsApp tokens in `.env.example` or code. Use placeholders only.
- **Strict Rate Limiting:** Attach `authRateLimiter` or `otpRateLimiter` from `src/middleware/rateLimiter.ts` to any route handling credentials, OTP generation, or password resets.
- **CORS Whitelist:** All allowed origins must be declared in `src/config/cors.ts` and shared between Express and Socket.io.
- **Webhook Raw Body:** Always retain `express.raw()` body parsing for webhook verification endpoints before standard `express.json()`.

---

## 9. Verification & Pre-Commit Checklist

Before committing or completing any task:
1. **Type Check:** Run `npx tsc --noEmit` to ensure **0 TypeScript errors**.
2. **Automated Tests:** Run `npm test` to verify that **100% of unit tests pass**.
3. **Swagger Verification:** Verify new routes appear properly at `/api-docs`.
