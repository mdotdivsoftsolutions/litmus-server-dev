import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  let token;

  // 1. Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Fallback to HttpOnly cookie
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;
      req.user = decoded;
    } catch (error) {
      // Token invalid or expired, just ignore for optional auth
    }
  }
  
  next();
};


export const roleMiddleware = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};

// Ready-to-use role middlewares
export const adminMiddleware = roleMiddleware([UserRole.ADMIN]);
export const labMiddleware = roleMiddleware([UserRole.LAB, UserRole.ADMIN]);
