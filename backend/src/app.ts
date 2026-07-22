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
    // Helmet para segurança básica de cabeçalhos HTTP
    this.express.use(helmet());

    // Em produção, restrinja CORS à URL do portal (FRONTEND_URL).
    // Em dev sem FRONTEND_URL, mantém o comportamento permissivo do cors().
    const frontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/$/, '');
    this.express.use(
      frontendUrl
        ? cors({
            origin: [frontendUrl, /^http:\/\/localhost:\d+$/],
            credentials: true
          })
        : cors()
    );

    // Parsear o corpo das requisições para JSON
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
  }

  private routes(): void {
    this.express.get('/health', (req, res, next) => {
      void healthHandler(req, res).catch(next);
    });

    this.express.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    this.express.use(routes);

    this.express.use(errorHandler);
  }
}

export default new App().express;
