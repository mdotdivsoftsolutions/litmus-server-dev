import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const createRateLimiter = (options: { windowMs: number; max: number; message?: string }) => {
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl}${req.path}_${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= max) {
      return next(new ApiError(429, message));
    }

    record.count += 1;
    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per windowMs
  message: 'Too many authentication attempts from this IP, please try again in 15 minutes',
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Max 5 OTP requests per 5 minutes per IP
  message: 'Too many OTP requests from this IP, please wait a few minutes before trying again',
});
