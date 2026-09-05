import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUserPayload, PortalAuthPayload } from '../types';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360-development-secret';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        message: 'Authentication token required',
        statusCode: 401,
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded || !decoded.userId || !decoded.role) {
      res.status(401).json({
        error: {
          message: 'Invalid token payload',
          statusCode: 401,
        },
      });
      return;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role as UserRole,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        statusCode: 401,
      },
    });
  }
};

export const requirePortalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        message: 'Portal authentication token required',
        statusCode: 401,
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded || decoded.type !== 'portal' || !decoded.customerId) {
      res.status(401).json({
        error: {
          message: 'Invalid portal token',
          statusCode: 401,
        },
      });
      return;
    }

    req.customer = {
      customerId: decoded.customerId,
      email: decoded.email,
      type: 'portal',
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: {
        message: 'Invalid or expired portal token',
        statusCode: 401,
      },
    });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          message: 'Access denied: insufficient permissions',
          statusCode: 403,
        },
      });
      return;
    }
    next();
  };
};
