import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/utils/ApiError';
import { ApiResponse } from '../src/utils/ApiResponse';
import { asyncHandler } from '../src/utils/asyncHandler';

describe('ApiError Utility', () => {
  it('should create an ApiError with proper status code and message', () => {
    const error = new ApiError(400, 'Invalid parameters');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid parameters');
    expect(error.isOperational).toBe(true);
  });

  it('should provide static factory methods', () => {
    const badReq = ApiError.badRequest('Bad data');
    expect(badReq.statusCode).toBe(400);

    const unauthorized = ApiError.unauthorized();
    expect(unauthorized.statusCode).toBe(401);

    const forbidden = ApiError.forbidden();
    expect(forbidden.statusCode).toBe(403);

    const notFound = ApiError.notFound();
    expect(notFound.statusCode).toBe(404);

    const conflict = ApiError.conflict();
    expect(conflict.statusCode).toBe(409);

    const internal = ApiError.internal();
    expect(internal.statusCode).toBe(500);
    expect(internal.isOperational).toBe(false);
  });
});

describe('ApiResponse Utility', () => {
  it('should format success responses properly', () => {
    const res = ApiResponse.success({ id: '123' }, 'Item fetched');
    expect(res.success).toBe(true);
    expect(res.message).toBe('Item fetched');
    expect(res.data).toEqual({ id: '123' });
  });

  it('should format paginated responses properly', () => {
    const meta = { page: 1, limit: 10, total: 50, totalPages: 5 };
    const res = ApiResponse.success(['a', 'b'], 'List', meta);
    expect(res.meta).toEqual(meta);
  });

  it('should format created responses properly', () => {
    const res = ApiResponse.created({ id: 'new_item' });
    expect(res.success).toBe(true);
    expect(res.message).toBe('Resource created successfully');
    expect(res.data).toEqual({ id: 'new_item' });
  });
});

describe('asyncHandler Utility', () => {
  it('should catch rejected promises and forward error to next()', async () => {
    const mockNext = (err: any) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Async failure');
    };

    const handler = asyncHandler(async () => {
      throw new Error('Async failure');
    });

    const mockReq = {} as any;
    const mockRes = {} as any;

    await handler(mockReq, mockRes, mockNext);
  });
});
