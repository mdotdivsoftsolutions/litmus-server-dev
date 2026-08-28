import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';
import logger from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = err;

  // Transform known Mongoose and JWT errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode ||
      (error.name === 'ValidationError' ? 400 : 
       error.name === 'CastError' ? 400 :
       error.code === 11000 ? 409 :
       error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 :
       error.name === 'ZodError' ? 422 : 500);

    let message = error.message || 'Internal Server Error';

    if (error.name === 'ValidationError' && error.errors) {
      message = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(', ');
    } else if (error.code === 11000) {
      const keys = Object.keys(error.keyValue || {});
      message = `Duplicate value entered for field: ${keys.join(', ')}`;
    } else if (error.name === 'CastError') {
      message = `Invalid resource identifier: ${error.value}`;
    }

    error = new ApiError(statusCode, message, error.errors || [], error.isOperational ?? false, err.stack);
  }

  // Structured Logging
  const logPayload = {
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    message: error.message,
    isOperational: error.isOperational,
    userId: (req as any).user?.id || (req as any).user?._id || 'anonymous',
  };

  if (error.statusCode >= 500) {
    logger.error(`[Server Error] ${JSON.stringify(logPayload)} - Stack: ${error.stack}`);
  } else {
    logger.warn(`[Client Error] ${JSON.stringify(logPayload)}`);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};
