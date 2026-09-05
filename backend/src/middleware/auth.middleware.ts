import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUserPayload, PortalAuthPayload } from '../types';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360-development-secret';

export type AuthenticatedSession =
  | {
      type: 'internal';
      userId: string;
      role: UserRole;
      email: string;
      name?: string;
    }
  | {
      type: 'portal';
      customerId: string;
      email: string;
    };

/**
 * Shared token verification utility supporting both Internal JWTs and Customer Portal tokens.
 */
export const verifyToken = (token: string): AuthenticatedSession | null => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded) return null;

    if (decoded.type === 'portal' && decoded.customerId) {
      return {
        type: 'portal',
        customerId: decoded.customerId,
        email: decoded.email || '',
      };
    }

    if (decoded.userId && decoded.role) {
      return {
        type: 'internal',
        userId: decoded.userId,
        role: decoded.role as UserRole,
        email: decoded.email || '',
        name: decoded.name || '',
      };
    }

    return null;
  } catch {
    return null;
  }
};

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
  const session = verifyToken(token);

  if (!session || session.type !== 'internal') {
    res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        statusCode: 401,
      },
    });
    return;
  }

  req.user = {
    userId: session.userId,
    role: session.role,
    email: session.email,
    name: session.name,
  };

  next();
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
  const session = verifyToken(token);

  if (!session || session.type !== 'portal') {
    res.status(401).json({
      error: {
        message: 'Invalid or expired portal token',
        statusCode: 401,
      },
    });
    return;
  }

  req.customer = {
    customerId: session.customerId,
    email: session.email,
    type: 'portal',
  };

  next();
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
