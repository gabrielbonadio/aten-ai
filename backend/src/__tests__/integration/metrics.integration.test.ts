import request from 'supertest';
import express from 'express';
import { metricsHandler } from '../../shared/health/metricsHandler';
import { httpMetricsMiddleware } from '../../shared/middlewares/httpMetricsMiddleware';
import { metrics } from '../../shared/observability/metrics';

function createMetricsApp() {
  const app = express();
  app.use(httpMetricsMiddleware);
  app.get('/metrics', metricsHandler);
  app.get('/ping', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.get('/fail', (_req, res) => {
    res.status(500).json({ message: 'fail' });
  });
  return app;
}

describe('GET /metrics', () => {
  beforeEach(() => {
    metrics._resetForTests();
  });

  it('retorna snapshot JSON com http e jobs', async () => {
    metrics.recordJobRun('appointmentReminders', {
      found: 3,
      sent: 2,
      failed: 1,
      durationMs: 100
    });

    const res = await request(createMetricsApp()).get('/metrics').expect(200);

    expect(res.body.service).toBe('aten-ai-backend');
    expect(res.body.http.requestsTotal).toBe(0);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].job).toBe('appointmentReminders');
  });

  it('middleware conta respostas HTTP (exceto /metrics)', async () => {
    const app = createMetricsApp();

    await request(app).get('/ping').expect(200);
    await request(app).get('/fail').expect(500);
    await request(app).get('/metrics').expect(200);

    const snap = metrics.snapshot();
    expect(snap.http.requestsTotal).toBe(2);
    expect(snap.http.responses2xx).toBe(1);
    expect(snap.http.responses5xx).toBe(1);
  });
});
