import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error Middleware Caught]:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const errorDetails = err.issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Validation error';
    res.status(400).json({
      error: {
        message: errorDetails,
        statusCode: 400,
      },
    });
    return;
  }

  // Generic/Unknown error
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message || 'Something went wrong';

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
    },
  });
};
