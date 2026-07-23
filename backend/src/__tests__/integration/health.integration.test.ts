import request from 'supertest';
import express from 'express';
import sequelize from '../../config/database';
import { healthHandler } from '../../shared/health/healthHandler';
import { errorHandler } from '../../shared/middlewares/errorHandler';

const mockedSequelize = sequelize as jest.Mocked<typeof sequelize>;

function createHealthApp() {
  const app = express();
  app.get('/health', (req, res, next) => {
    void healthHandler(req, res).catch(next);
  });
  app.use(errorHandler);
  return app;
}

describe('GET /health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 200 e database.up quando o MySQL responde', async () => {
    mockedSequelize.authenticate.mockResolvedValue(undefined);

    const res = await request(createHealthApp()).get('/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database.status).toBe('up');
    expect(typeof res.body.checks.database.latencyMs).toBe('number');
    expect(res.body.service).toBe('aten-ai-backend');
  });

  it('retorna 503 e database.down quando o MySQL falha', async () => {
    mockedSequelize.authenticate.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(createHealthApp()).get('/health').expect(503);

    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database.status).toBe('down');
    expect(res.body.checks.database.error).toBe('database_unreachable');
  });
});
