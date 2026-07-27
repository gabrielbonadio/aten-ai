import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../logging/logger';
import { captureServerException } from '../observability/sentry';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('http.app_error', {
        statusCode: err.statusCode,
        message: err.message,
        path: req.path,
        method: req.method
      });
      captureServerException(err, {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode
      });
    }
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  logger.error('http.unhandled_error', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : String(err),
    stack: process.env.NODE_ENV === 'production' ? undefined : err instanceof Error ? err.stack : undefined
  });

  captureServerException(err, {
    path: req.path,
    method: req.method,
    statusCode: 500
  });

  res.status(500).json({ message: 'Erro interno do servidor.' });
}
