import { BookingStatus, CollectionStatus, UserRole } from '../types';

export function parseBookingListParams(query: Record<string, unknown> | { page?: unknown; limit?: unknown; search?: unknown; status?: unknown; reportsOnly?: unknown }) {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const requestedLimit = parseInt(String(query.limit ?? '10'), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
  const search = String(query.search || '').trim();
  const status = String(query.status || 'all').toLowerCase();
  const reportsOnly = String(query.reportsOnly || '') === 'true' || status === 'reports';
  return { page, limit, search, status, reportsOnly };
}

export function bookingListStatusFilter(status: string, reportsOnly: boolean): Record<string, unknown> {
  if (status === 'active') {
    return { status: { $in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.IN_PROGRESS] } };
  }
  if (status === 'completed') {
    return { status: BookingStatus.COMPLETED };
  }
  if (reportsOnly) {
    return {
      isReportApprovedByAdmin: true,
      reportFiles: { $exists: true, $not: { $size: 0 } },
    };
  }
  return {};
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isPickupCityCovered(city: string, pickupCities: string[] = []): boolean {
  const allowed = pickupCities.map((c) => c.trim().toLowerCase()).filter(Boolean);
  const cityNorm = String(city || '').trim().toLowerCase();
  if (!cityNorm || allowed.length === 0) return false;
  return allowed.some((c) => cityNorm === c || cityNorm.includes(c) || c.includes(cityNorm));
}

export function canAddCourierTracking(input: {
  trackingId?: unknown;
  userId?: string;
  bookingUserId?: string;
  collectionMethod?: string;
  metadataCollectionMethod?: string;
}): { ok: true } | { ok: false; status: number; message: string } {
  if (!input.trackingId || !String(input.trackingId).trim()) {
    return { ok: false, status: 400, message: 'Tracking ID is required' };
  }
  if (!input.bookingUserId) {
    return { ok: false, status: 404, message: 'Booking not found' };
  }
  if (input.bookingUserId !== input.userId) {
    return { ok: false, status: 403, message: 'Not authorized to update this booking' };
  }
  const method = input.collectionMethod || input.metadataCollectionMethod;
  if (method !== 'COURIER') {
    return { ok: false, status: 400, message: 'Tracking can only be added for courier bookings' };
  }
  return { ok: true };
}

export function canDownloadBookingReport(input: {
  bookingExists: boolean;
  ownerId?: string;
  requesterId?: string;
  requesterRole?: string;
  isReportApprovedByAdmin?: boolean;
  reportFiles?: string[];
}): { ok: true } | { ok: false; status: number; message: string } {
  if (!input.bookingExists) {
    return { ok: false, status: 404, message: 'Booking not found' };
  }
  if (input.ownerId !== input.requesterId && input.requesterRole === UserRole.USER) {
    return { ok: false, status: 403, message: 'Not authorized to download this report' };
  }
  if (!input.isReportApprovedByAdmin || !input.reportFiles?.length) {
    return { ok: false, status: 404, message: 'Report is not available yet' };
  }
  return { ok: true };
}

export function sanitizeBookingReports<T extends { isReportApprovedByAdmin?: boolean; reportFiles?: unknown; reportSummary?: unknown }>(obj: T): T {
  if (!obj.isReportApprovedByAdmin) {
    const clone = { ...obj };
    delete clone.reportFiles;
    delete clone.reportSummary;
    return clone;
  }
  return obj;
}

export function collectionStatusForMethod(method?: string): CollectionStatus {
  if (method === 'COURIER') return CollectionStatus.NOT_REQUIRED;
  return CollectionStatus.PENDING;
}
