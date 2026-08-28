/**
 * Admin Controller Facade (Re-exporting modularized sub-controllers)
 * Decomposed into domain-specific modules:
 * - adminUser.controller.ts
 * - adminBooking.controller.ts
 * - adminApproval.controller.ts
 * - adminAnalytics.controller.ts
 */

export * from './admin/adminUser.controller';
export * from './admin/adminBooking.controller';
export * from './admin/adminApproval.controller';
export * from './admin/adminAnalytics.controller';
