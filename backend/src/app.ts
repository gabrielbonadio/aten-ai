import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './shared/docs/swagger';
import { errorHandler } from './shared/middlewares/errorHandler';
import authRoutes from './modules/auth/routes';
import customersRoutes from './modules/customers/customers.routes';
import tenantsRoutes from './modules/tenants/routes';

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
    // Cors para permitir requisições do nosso futuro painel Angular
    this.express.use(cors());
    // Parsear o corpo das requisições para JSON
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
  }

  private routes(): void {
    // Uma rota de teste (Health Check) só para sabermos que está tudo online
    this.express.get('/health', (req, res) => {
      res.status(200).json({ status: 'Aten AI Backend is running! 🚀' });
    });

    this.express.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    this.express.use(authRoutes);
    this.express.use(customersRoutes);
    this.express.use(tenantsRoutes);

    this.express.use(errorHandler);
  }
}

export default new App().express;