import client from "prom-client";

const METRICS_ENABLED = process.env.METRICS_ENABLED === "true";
const WORKER_ID = process.env.HOSTNAME || "unknown";

// registry isolado
export const register = new client.Registry();

if (METRICS_ENABLED) {
  client.collectDefaultMetrics({
    register,
    labels: { worker: WORKER_ID },
  });
}

// helper para evitar if em todo lugar
function enabledMetric<T>(metric: T): T | null {
  return METRICS_ENABLED ? metric : null;
}

// counters
export const jobsProcessed = enabledMetric(
  new client.Counter({
    name: "jobs_processed_total",
    help: "Total de jobs processados com sucesso",
    labelNames: ["worker"],
    registers: [register],
  })
);

export const jobsFailed = enabledMetric(
  new client.Counter({
    name: "jobs_failed_total",
    help: "Total de jobs que falharam",
    labelNames: ["worker"],
    registers: [register],
  })
);

// histogram ajustado
export const jobDuration = enabledMetric(
  new client.Histogram({
    name: "job_duration_seconds",
    help: "Tempo de execução dos jobs",
    buckets: [1, 2, 5, 10, 20],
    labelNames: ["worker"],
    registers: [register],
  })
);

// métricas de fila (somente 1 worker deve usar)
export const queueWaiting = enabledMetric(
  new client.Gauge({
    name: "queue_waiting_jobs",
    help: "Jobs aguardando na fila",
    labelNames: ["queue"],
    registers: [register],
  })
);

export const queueActive = enabledMetric(
  new client.Gauge({
    name: "queue_active_jobs",
    help: "Jobs sendo processados",
    labelNames: ["queue"],
    registers: [register],
  })
);

export const queueCompleted = enabledMetric(
  new client.Gauge({
    name: "queue_completed_jobs",
    help: "Jobs finalizados",
    labelNames: ["queue"],
    registers: [register],
  })
);

export const queueFailed = enabledMetric(
  new client.Gauge({
    name: "queue_failed_jobs",
    help: "Jobs com falha",
    labelNames: ["queue"],
    registers: [register],
  })
);

// helper exportado
export const isMetricsEnabled = METRICS_ENABLED;
export const workerId = WORKER_ID;