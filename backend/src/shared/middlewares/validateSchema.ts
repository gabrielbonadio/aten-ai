import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../errors/AppError';

export function validateSchema(
  schema: Joi.ObjectSchema,
  target: 'body' | 'query' | 'params' = 'body'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const input = target === 'query' ? req.query : target === 'params' ? req.params : req.body;
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
      // Express (e/ou adapters) podem expor `req.query` com getter-only; evitar reatribuição direta.
      Object.defineProperty(req, 'query', {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else if (target === 'params') {
      // Express pode expor `req.params` com getter-only; evitar reatribuição direta.
      Object.defineProperty(req, 'params', {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else {
      req.body = value;
    }
    next();
  };
}
