import { describe, it, expect } from 'vitest';
import { BookingStatus, CollectionStatus, UserRole } from '../src/types';
import {
  parseBookingListParams,
  bookingListStatusFilter,
  escapeRegex,
  isPickupCityCovered,
  canAddCourierTracking,
  canDownloadBookingReport,
  sanitizeBookingReports,
  collectionStatusForMethod,
} from '../src/utils/bookingRules';

describe('parseBookingListParams', () => {
  it('defaults to page 1 and limit 10', () => {
    expect(parseBookingListParams({})).toMatchObject({ page: 1, limit: 10, search: '', status: 'all', reportsOnly: false });
  });

  it('clamps limit between 1 and 50', () => {
    expect(parseBookingListParams({ limit: 0 }).limit).toBe(1);
    expect(parseBookingListParams({ limit: 999 }).limit).toBe(50);
  });

  it('treats status=reports as reportsOnly', () => {
    expect(parseBookingListParams({ status: 'reports' }).reportsOnly).toBe(true);
  });

  it('parses reportsOnly=true', () => {
    expect(parseBookingListParams({ reportsOnly: 'true' }).reportsOnly).toBe(true);
  });
});

describe('bookingListStatusFilter', () => {
  it('filters active bookings', () => {
    expect(bookingListStatusFilter('active', false)).toEqual({
      status: { $in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.IN_PROGRESS] },
    });
  });

  it('filters completed bookings', () => {
    expect(bookingListStatusFilter('completed', false)).toEqual({ status: BookingStatus.COMPLETED });
  });

  it('filters approved reports', () => {
    expect(bookingListStatusFilter('all', true)).toEqual({
      isReportApprovedByAdmin: true,
      reportFiles: { $exists: true, $not: { $size: 0 } },
    });
  });

  it('returns empty filter for all', () => {
    expect(bookingListStatusFilter('all', false)).toEqual({});
  });
});

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a+b(c)')).toBe('a\\+b\\(c\\)');
  });
});

describe('isPickupCityCovered', () => {
  it('matches exact city case-insensitively', () => {
    expect(isPickupCityCovered('Chennai', ['chennai', 'mumbai'])).toBe(true);
  });

  it('rejects uncovered cities', () => {
    expect(isPickupCityCovered('Delhi', ['chennai'])).toBe(false);
  });

  it('rejects empty city or empty coverage', () => {
    expect(isPickupCityCovered('', ['chennai'])).toBe(false);
    expect(isPickupCityCovered('Chennai', [])).toBe(false);
  });
});

describe('canAddCourierTracking', () => {
  it('requires tracking id', () => {
    const result = canAddCourierTracking({ trackingId: '  ', userId: 'u1', bookingUserId: 'u1', collectionMethod: 'COURIER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it('returns 404 when booking is missing', () => {
    const result = canAddCourierTracking({ trackingId: 'AWB1', userId: 'u1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it('returns 403 when user does not own the booking', () => {
    const result = canAddCourierTracking({ trackingId: 'AWB1', userId: 'u1', bookingUserId: 'u2', collectionMethod: 'COURIER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('rejects pickup bookings', () => {
    const result = canAddCourierTracking({ trackingId: 'AWB1', userId: 'u1', bookingUserId: 'u1', collectionMethod: 'PICKUP' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it('allows owner courier bookings', () => {
    expect(canAddCourierTracking({ trackingId: 'AWB1', userId: 'u1', bookingUserId: 'u1', collectionMethod: 'COURIER' })).toEqual({ ok: true });
  });
});

describe('canDownloadBookingReport', () => {
  it('blocks other users', () => {
    const result = canDownloadBookingReport({
      bookingExists: true,
      ownerId: 'u1',
      requesterId: 'u2',
      requesterRole: UserRole.USER,
      isReportApprovedByAdmin: true,
      reportFiles: ['https://files/report.pdf'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('hides unapproved reports', () => {
    const result = canDownloadBookingReport({
      bookingExists: true,
      ownerId: 'u1',
      requesterId: 'u1',
      requesterRole: UserRole.USER,
      isReportApprovedByAdmin: false,
      reportFiles: ['https://files/report.pdf'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it('allows owner with approved file', () => {
    expect(
      canDownloadBookingReport({
        bookingExists: true,
        ownerId: 'u1',
        requesterId: 'u1',
        requesterRole: UserRole.USER,
        isReportApprovedByAdmin: true,
        reportFiles: ['https://files/report.pdf'],
      })
    ).toEqual({ ok: true });
  });
});

describe('sanitizeBookingReports', () => {
  it('strips report files until admin approval', () => {
    const out = sanitizeBookingReports({ isReportApprovedByAdmin: false, reportFiles: ['secret.pdf'] });
    expect(out.reportFiles).toBeUndefined();
  });

  it('keeps files after approval', () => {
    const out = sanitizeBookingReports({ isReportApprovedByAdmin: true, reportFiles: ['ok.pdf'] });
    expect(out.reportFiles).toEqual(['ok.pdf']);
  });
});

describe('collectionStatusForMethod', () => {
  it('marks courier as not required', () => {
    expect(collectionStatusForMethod('COURIER')).toBe(CollectionStatus.NOT_REQUIRED);
  });

  it('defaults pickup to pending', () => {
    expect(collectionStatusForMethod('PICKUP')).toBe(CollectionStatus.PENDING);
  });
});
