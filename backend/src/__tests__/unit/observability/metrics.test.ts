import { metrics } from '../../../shared/observability/metrics';

describe('metrics', () => {
  beforeEach(() => {
    metrics._resetForTests();
  });

  it('conta status HTTP por faixa', () => {
    metrics.recordHttpStatus(200);
    metrics.recordHttpStatus(201);
    metrics.recordHttpStatus(404);
    metrics.recordHttpStatus(500);

    const snap = metrics.snapshot();
    expect(snap.http.requestsTotal).toBe(4);
    expect(snap.http.responses2xx).toBe(2);
    expect(snap.http.responses4xx).toBe(1);
    expect(snap.http.responses5xx).toBe(1);
    expect(snap.http.last5xxAt).toMatch(/^\d{4}-/);
  });

  it('registra última execução de job com found/sent/failed', () => {
    metrics.recordJobRun('appointmentReminders', {
      found: 10,
      sent: 8,
      failed: 2,
      durationMs: 1500
    });

    const snap = metrics.snapshot();
    expect(snap.jobs).toHaveLength(1);
    expect(snap.jobs[0]).toMatchObject({
      job: 'appointmentReminders',
      found: 10,
      sent: 8,
      failed: 2,
      durationMs: 1500,
      totalRuns: 1
    });
    expect(snap.jobs[0].lastRunAt).toMatch(/^\d{4}-/);
  });

  it('mapeia contadores genéricos (GC deleted → sent)', () => {
    metrics.recordJobCounters('conversationGC', { deleted: 5 }, 42);

    const snap = metrics.snapshot();
    expect(snap.jobs[0]).toMatchObject({
      job: 'conversationGC',
      found: 5,
      sent: 5,
      failed: 0
    });
  });
});
