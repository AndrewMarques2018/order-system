import { db } from "./config/db";
import {
  queueWaiting,
  queueActive,
  queueCompleted,
  queueFailed,
  isMetricsEnabled,
} from "./config/metrics";

async function updateQueueMetrics() {
  if (!isMetricsEnabled) return;

  const result = await db.query(`
    SELECT status, COUNT(*) 
    FROM orders 
    GROUP BY status
  `);

  const stats: Record<string, number> = {};

  for (const row of result.rows) {
    stats[row.status] = Number(row.count);
  }

  queueWaiting?.labels("order-processing").set(stats["pending"] || 0);
  queueActive?.labels("order-processing").set(stats["processing"] || 0);
  queueCompleted?.labels("order-processing").set(stats["completed"] || 0);
  queueFailed?.labels("order-processing").set(stats["failed"] || 0);
}

setInterval(updateQueueMetrics, 5000);