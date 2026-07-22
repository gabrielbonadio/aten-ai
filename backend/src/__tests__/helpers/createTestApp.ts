import express, { type Router } from 'express';
import { errorHandler } from '../../shared/middlewares/errorHandler';

export function createTestApp(...routers: Router[]) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  for (const router of routers) {
    app.use(router);
  }

  app.use(errorHandler);
  return app;
}
