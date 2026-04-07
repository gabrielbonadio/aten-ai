import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../errors/AppError';

export function validateSchema(
  schema: Joi.ObjectSchema,
  target: 'body' | 'query' = 'body'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const input = target === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(input, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((d) => d.message.replace(/"/g, '')).join('; ');
      next(new AppError(message, 400));
      return;
    }

    if (target === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }
    next();
  };
}
