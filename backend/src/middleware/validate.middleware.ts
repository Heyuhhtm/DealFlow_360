import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((i: any) => `${i.path.join('.') || 'body'}: ${i.message}`).join(', ');
        res.status(400).json({
          error: {
            message,
            statusCode: 400,
          },
        });
        return;
      }
      next(error);
    }
  };
};
