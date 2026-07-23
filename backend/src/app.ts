import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './shared/docs/swagger';
import { healthHandler } from './shared/health/healthHandler';
import { errorHandler } from './shared/middlewares/errorHandler';
import routes from './routes';

class App {
  public express: Application;

  constructor() {
    this.express = express();
    this.middlewares();
    this.routes();
  }

  private middlewares(): void {
    this.express.use(helmet());

    const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
    const frontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/$/, '');

    if (nodeEnv === 'production') {
      if (!frontendUrl) {
        throw new Error('FRONTEND_URL é obrigatório em production para configurar CORS.');
      }
      this.express.use(
        cors({
          origin: frontendUrl,
          credentials: true
        })
      );
    } else if (frontendUrl) {
      this.express.use(
        cors({
          origin: [frontendUrl, /^http:\/\/localhost:\d+$/],
          credentials: true
        })
      );
    } else {
      // Dev sem FRONTEND_URL: permissivo apenas fora de production.
      this.express.use(cors());
    }

    this.express.use(express.json({ limit: '100kb' }));
    this.express.use(express.urlencoded({ extended: true, limit: '100kb' }));
  }

  private routes(): void {
    this.express.get('/health', (req, res, next) => {
      void healthHandler(req, res).catch(next);
    });

    const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
    if (nodeEnv !== 'production') {
      this.express.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    }

    this.express.use(routes);

    this.express.use(errorHandler);
  }
}

export default new App().express;
