export type JobRunSnapshot = {
  job: string;
  lastRunAt: string | null;
  durationMs: number | null;
  found: number;
  sent: number;
  failed: number;
  totalRuns: number;
};

export type HttpSnapshot = {
  requestsTotal: number;
  responses2xx: number;
  responses4xx: number;
  responses5xx: number;
  last5xxAt: string | null;
};

export type MetricsSnapshot = {
  service: string;
  uptimeSec: number;
  collectedAt: string;
  http: HttpSnapshot;
  jobs: JobRunSnapshot[];
};

type JobAccumulator = {
  lastRunAt: string | null;
  durationMs: number | null;
  found: number;
  sent: number;
  failed: number;
  totalRuns: number;
};

const http: HttpSnapshot = {
  requestsTotal: 0,
  responses2xx: 0,
  responses4xx: 0,
  responses5xx: 0,
  last5xxAt: null
};

const jobs = new Map<string, JobAccumulator>();

function getJobAccumulator(name: string): JobAccumulator {
  let acc = jobs.get(name);
  if (!acc) {
    acc = {
      lastRunAt: null,
      durationMs: null,
      found: 0,
      sent: 0,
      failed: 0,
      totalRuns: 0
    };
    jobs.set(name, acc);
  }
  return acc;
}

export const metrics = {
  recordHttpStatus(statusCode: number): void {
    http.requestsTotal++;
    if (statusCode >= 500) {
      http.responses5xx++;
      http.last5xxAt = new Date().toISOString();
    } else if (statusCode >= 400) {
      http.responses4xx++;
    } else if (statusCode >= 200 && statusCode < 300) {
      http.responses2xx++;
    }
  },

  recordJobRun(
    job: string,
    result: { found: number; sent: number; failed: number; durationMs: number }
  ): void {
    const acc = getJobAccumulator(job);
    acc.lastRunAt = new Date().toISOString();
    acc.durationMs = result.durationMs;
    acc.found = result.found;
    acc.sent = result.sent;
    acc.failed = result.failed;
    acc.totalRuns++;
  },

  /** GC e jobs com contadores diferentes usam `counters` genérico. */
  recordJobCounters(job: string, counters: Record<string, number>, durationMs: number): void {
    this.recordJobRun(job, {
      found: counters.found ?? counters.deleted ?? 0,
      sent: counters.sent ?? counters.deleted ?? 0,
      failed: counters.failed ?? 0,
      durationMs
    });
  },

  snapshot(): MetricsSnapshot {
    const jobList: JobRunSnapshot[] = [...jobs.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([job, acc]) => ({
        job,
        lastRunAt: acc.lastRunAt,
        durationMs: acc.durationMs,
        found: acc.found,
        sent: acc.sent,
        failed: acc.failed,
        totalRuns: acc.totalRuns
      }));

    return {
      service: 'aten-ai-backend',
      uptimeSec: Math.floor(process.uptime()),
      collectedAt: new Date().toISOString(),
      http: { ...http },
      jobs: jobList
    };
  },

  /** Apenas para testes. */
  _resetForTests(): void {
    http.requestsTotal = 0;
    http.responses2xx = 0;
    http.responses4xx = 0;
    http.responses5xx = 0;
    http.last5xxAt = null;
    jobs.clear();
  }
};
