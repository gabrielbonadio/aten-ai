import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../errors/AppError';

export function validateSchema(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((d) => d.message.replace(/"/g, '')).join('; ');
      next(new AppError(message, 400));
      return;
    }

    req.body = value;
    next();
  };
}
