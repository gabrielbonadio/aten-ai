import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SaaS B2B API',
      version: '1.0.0',
      description: 'API REST multi-tenant com autenticação JWT (Bearer).'
    },
    servers: [{ url: '/', description: 'Servidor atual' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Envie o token no header: Authorization: Bearer <token>'
        }
      },
      schemas: {
        ErrorMessage: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Mensagem de erro (validação, AppError, etc.)' }
          },
          required: ['message']
        }
      }
    }
  },
  apis: [
    path.join(process.cwd(), 'src/modules/auth/routes.ts'),
    path.join(process.cwd(), 'src/modules/tutors/routes.ts'),
    path.join(process.cwd(), 'src/modules/pets/routes.ts'),
    path.join(process.cwd(), 'src/modules/appointments/routes.ts'),
    path.join(process.cwd(), 'src/modules/medical-records/routes.ts'),
    path.join(process.cwd(), 'src/modules/dashboard/routes.ts'),
    path.join(process.cwd(), 'src/modules/settings/routes.ts')
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
