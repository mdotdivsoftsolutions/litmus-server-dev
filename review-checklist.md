# Backend Code Review Checklist
**Project:** Node.js + Express + MongoDB + Socket.io — Admin / Employee / Lab Management System
**Purpose:** Give this file to the review agent. It should go section by section, flag every violation with file + line reference, and suggest a fix. Project is large, will keep growing, and new developers will join — so consistency and scalability matter as much as correctness.

---

## 1. Folder Structure & Project Architecture

- [ ] Clear separation of layers: `routes/`, `controllers/`, `services/`, `models/`, `middlewares/`, `utils/`, `config/`, `sockets/`, `validators/`
- [ ] No business logic sitting inside route files — routes only wire `path -> middleware -> controller`
- [ ] No business logic sitting inside controllers — controllers only handle req/res, call services, and return responses
- [ ] Feature/domain-based grouping considered where it helps (e.g. `modules/admin`, `modules/employee`, `modules/lab`) instead of one giant flat `controllers/` folder
- [ ] Socket.io code isolated in its own layer (`sockets/`), not scattered inside controllers or routes
- [ ] Clear boundary between Admin, Employee, and Lab modules — no circular imports between them
- [ ] A single `app.js`/`server.js` entry point that only bootstraps (loads env, connects DB, mounts routes, starts server, starts socket server) — no business logic here
- [ ] Config values (DB URL, JWT secret, ports, socket CORS origins, etc.) centralized in `config/` and read from `.env`, never hardcoded
- [ ] `.env.example` file exists and is kept in sync with actual required env vars
- [ ] Consistent import structure (absolute/aliased imports vs long relative `../../../` chains)
- [ ] No dead/unused files, commented-out old code blocks, or duplicate "v2" files left in the repo

## 2. Naming Conventions

- [ ] Consistent file naming convention across the whole repo (pick one: `camelCase.js`, `kebab-case.js`, or `PascalCase.js` for classes/models) — flag any mixed usage
- [ ] Model files singular + PascalCase (`User.js`, `Lab.js`, `Employee.js`)
- [ ] Route files plural (`userRoutes.js`, `labRoutes.js`)
- [ ] Controller/service files match their domain name (`labController.js` ↔ `labService.js`)
- [ ] Consistent suffixes: `*.controller.js`, `*.service.js`, `*.model.js`, `*.middleware.js`, `*.route.js`, `*.util.js` (or whichever pattern chosen — must be uniform)
- [ ] Variable/function names are descriptive, no single-letter vars outside tight loops
- [ ] Booleans named as questions (`isActive`, `hasAccess`, `canEdit`)
- [ ] No ambiguous names like `data`, `temp`, `obj`, `handleStuff`, `doWork`
- [ ] Consistent casing for MongoDB field names across all schemas (camelCase recommended)

## 3. File & Function Size Limits (Maintainability)

- [ ] No file exceeds ~250–300 lines — flag any file that does, and suggest a split
- [ ] No function exceeds ~40–50 lines — flag long functions and suggest extraction into smaller helpers
- [ ] No function has more than ~4 parameters — suggest passing an options object instead
- [ ] Cyclomatic complexity kept low — deeply nested if/else or callback pyramids flagged and simplified (use early returns, guard clauses)
- [ ] One responsibility per function (Single Responsibility Principle) — flag functions doing validation + DB call + response formatting all at once
- [ ] No duplicated logic across files — repeated code blocks should be extracted into a shared util/service

## 4. Express / Route Layer

- [ ] All routes grouped and mounted with proper prefixes (`/api/v1/admin`, `/api/v1/employee`, `/api/v1/lab`)
- [ ] API versioning in place (`/api/v1/...`) so future breaking changes don't break old clients
- [ ] Consistent REST conventions (proper use of GET/POST/PUT/PATCH/DELETE, resource-based URLs, no verbs in URLs like `/getUser`)
- [ ] Route-level middleware order is correct (auth → role check → validation → controller)
- [ ] No duplicate route definitions or conflicting paths
- [ ] Pagination, filtering, and sorting implemented consistently for all list endpoints (important since labs/employees will scale)
- [ ] Consistent response shape across all endpoints (e.g. `{ success, message, data, error }`)
- [ ] Centralized async error handling — no repeated try/catch boilerplate in every controller (use an `asyncHandler` wrapper or similar)

## 5. Middleware

- [ ] Centralized error-handling middleware exists and catches all errors (including unhandled promise rejections)
- [ ] Custom `ApiError`/`AppError` class used for consistent error objects (status code, message, isOperational flag)
- [ ] Authentication middleware (JWT/session) is DRY and reused, not duplicated per route file
- [ ] Role-based access control (RBAC) middleware clearly separates Admin / Employee / Lab-level permissions
- [ ] Request validation middleware (Joi/Zod/express-validator) used consistently on all routes accepting input — no manual `if (!req.body.x)` checks scattered around
- [ ] Rate limiting middleware present on sensitive/public routes (login, OTP, etc.)
- [ ] `helmet`, `cors` (with explicit allowed origins, not `*`), and `compression` configured properly
- [ ] Request logging middleware (morgan/pino-http) present, and logs don't leak sensitive data (passwords, tokens)

## 6. Controllers & Services

- [ ] Controllers are thin — validate input already done by middleware, call the service, send response
- [ ] Business logic lives in `services/`, not controllers — makes logic reusable and testable
- [ ] Services never directly touch `req`/`res` — keeps them reusable by sockets, cron jobs, scripts, etc.
- [ ] No direct Mongoose queries inside controllers — always go through a service or repository layer
- [ ] Consistent error propagation (`throw new ApiError(...)`) instead of inconsistent `res.status().json()` calls mixed with thrown errors

## 7. Utils / Helpers

- [ ] `utils/` folder is organized by purpose (`utils/date.js`, `utils/token.js`, `utils/response.js`, `utils/socketEmitter.js`, etc.) — not one dumping-ground `utils/helper.js`
- [ ] No duplicate utility functions reimplemented in multiple files
- [ ] Pure functions only in utils — no side effects, no DB calls, no `req`/`res` dependency
- [ ] Common response formatters (success/error) centralized so all controllers use the same shape
- [ ] Constants (roles, status enums, socket event names, error codes) centralized in a `constants/` folder — no magic strings/numbers scattered in code

## 8. MongoDB / Mongoose Layer

- [ ] Schemas defined with proper types, `required`, `default`, and `enum` constraints — no loosely typed `Mixed` fields unless truly needed
- [ ] Indexes defined for frequently queried fields (especially for lab lookups under employee, and employee lookups under admin) — flag missing indexes on foreign-key-like fields
- [ ] Relationships modeled consistently (referencing via `ObjectId` + `populate` vs embedding) — check the choice makes sense per relationship (Admin→Employee→Lab hierarchy)
- [ ] No unbounded `.find()` queries without pagination (`.limit()`/`.skip()` or cursor-based pagination) — risk as data grows
- [ ] `select: false` used for sensitive fields (passwords, tokens) by default at schema level
- [ ] Schema-level validation exists (don't rely only on request validation)
- [ ] Timestamps (`createdAt`/`updatedAt`) enabled on all schemas
- [ ] Soft-delete pattern (`isDeleted`/`deletedAt`) considered instead of hard deletes where audit history matters (admin/employee/lab data)
- [ ] No N+1 query patterns (looping and querying inside the loop) — use `populate` or aggregation instead
- [ ] Mongoose connection setup handles reconnection, and app doesn't crash silently on DB disconnect
- [ ] Transactions used for multi-document writes that must be atomic (e.g. creating an employee + their default lab records together)

## 9. Socket.io Server

- [ ] Socket connection/auth handled via middleware (`io.use(...)`) validating JWT before allowing connection — not trusting client-sent user IDs
- [ ] Socket event names centralized as constants (not raw strings duplicated across client/server)
- [ ] Clear room/namespace strategy (e.g. per-lab room, per-employee room, per-admin room) so events don't broadcast to unrelated users
- [ ] Socket disconnect/cleanup logic present (remove from rooms, clear any in-memory maps) to avoid memory leaks
- [ ] No business logic directly inside socket event handlers — delegate to services, same as controllers
- [ ] Error handling on socket events (try/catch, emit an `error` event back) so one bad event doesn't crash the server
- [ ] If running multiple server instances in the future, note whether a Socket.io adapter (Redis adapter) will be needed for horizontal scaling — flag if not yet planned
- [ ] Sensitive data not emitted over sockets unless the recipient is authorized for it (role check before emit)

## 10. Authentication & Authorization

- [ ] Passwords hashed with bcrypt/argon2, never stored/logged in plain text
- [ ] JWT secrets, refresh token strategy, and token expiry reviewed — refresh token rotation in place if used
- [ ] Role/permission checks enforced on both REST routes and Socket.io events (not just REST)
- [ ] Admin-only, Employee-only, and Lab-scoped routes clearly guarded — check for any route that's supposed to be restricted but isn't
- [ ] No sensitive data (passwords, tokens, internal IDs) returned in API responses

## 11. Error Handling & Logging

- [ ] Global error handler catches sync + async errors + unhandled rejections + uncaught exceptions
- [ ] Errors distinguished between operational (expected, e.g. validation error) and programmer errors (bugs) — logged differently
- [ ] Structured logging (pino/winston) instead of raw `console.log` scattered through the codebase — flag any leftover `console.log`
- [ ] Logs include request context (request ID, user ID, route) for traceability, without leaking secrets
- [ ] Meaningful HTTP status codes used consistently (400 vs 401 vs 403 vs 404 vs 409 vs 500)

## 12. Security

- [ ] Input sanitization against NoSQL injection (e.g. `express-mongo-sanitize`)
- [ ] XSS protection on any fields rendered elsewhere
- [ ] Environment secrets never committed to git — check `.gitignore` includes `.env`
- [ ] Dependency vulnerabilities checked (`npm audit`) as part of the review
- [ ] File upload handling (if any) validates file type/size and doesn't trust client-provided filenames
- [ ] CORS configured with explicit origins for both REST and Socket.io, not wildcard, in production

## 13. Package / Dependency Usage

- [ ] No unused dependencies in `package.json` — flag anything not actually imported
- [ ] No duplicate packages solving the same problem (e.g. both `moment` and `dayjs`, both `lodash` and custom equivalents)
- [ ] Dependencies pinned to sensible version ranges; no `*` or overly loose ranges
- [ ] Dev dependencies (nodemon, eslint, prettier, testing libs) properly separated under `devDependencies`
- [ ] `engines` field in `package.json` specifies supported Node version for consistency across new developers' machines

## 14. Code Quality & Style Consistency

- [ ] ESLint + Prettier configured and enforced (ideally via a pre-commit hook — husky + lint-staged)
- [ ] Consistent use of `async/await` — no mixing of callbacks, raw `.then()` chains, and `async/await` in the same codebase
- [ ] No commented-out dead code left in files
- [ ] No `TODO`/`FIXME` comments left unresolved without a tracked ticket reference
- [ ] Consistent quote style, semicolons, indentation enforced by formatter, not manual review
- [ ] No unnecessary console logs, debug statements, or test code left in production files

## 15. Testing

- [ ] Unit tests exist for services/utils (pure logic)
- [ ] Integration tests exist for critical routes (auth, lab creation, employee-lab assignment)
- [ ] Socket.io events have at least basic test coverage (connection, auth rejection, core events)
- [ ] Test files follow a consistent naming pattern (`*.test.js` / `*.spec.js`) and sit alongside or in a mirrored `__tests__/` structure
- [ ] CI runs tests + lint on every PR (flag if missing)

## 16. Documentation & Developer Onboarding

- [ ] `README.md` explains setup, env vars, folder structure, and how to run the project locally
- [ ] API documented (Swagger/OpenAPI or Postman collection) and kept up to date
- [ ] Inline JSDoc comments on complex functions/services, especially non-obvious business rules around admin/employee/lab hierarchy
- [ ] A short "architecture decisions" note (even informal) explaining why certain patterns were chosen, so new developers don't reinvent or fight the structure
- [ ] Git commit message convention followed (Conventional Commits recommended) for a clean, readable history as the team grows

## 17. Scalability & Future-Proofing (given team + data will grow)

- [ ] Code structured so a new "section" (beyond admin/employee/lab) could be added without touching unrelated modules
- [ ] No tight coupling between Admin, Employee, and Lab modules — changes in one shouldn't force changes in the others
- [ ] Caching strategy considered for expensive/frequent reads (Redis) if not already present
- [ ] Background job handling (queues like BullMQ) considered for heavy async tasks (notifications, report generation) instead of blocking request handlers
- [ ] Horizontal scaling readiness noted: is app stateless (no in-memory session/user state that breaks with multiple instances), and is Socket.io ready for a multi-instance setup

---

## How the Agent Should Report Findings

For each issue found, report in this format:

```
[Section] File path : Line number(s)
Issue: <what's wrong>
Why it matters: <impact, esp. for scale/maintainability/new devs>
Suggested fix: <concrete fix>
Severity: Critical / High / Medium / Low
```

Group the final report by section number (1–17 above), and end with a short **Top 5 priority fixes** summary.