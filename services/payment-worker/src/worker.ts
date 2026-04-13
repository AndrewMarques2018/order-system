import "./server";
import "./queue-monitor";

import { UnrecoverableError, Worker } from "bullmq";
import { redisConnection } from "./config/redis";
import { db } from "./config/db";
import { logger } from "./config/logger";
import { jobsProcessed, jobDuration, jobsFailed, isMetricsEnabled, workerId } from "./config/metrics";
import { sweepLostOrders } from "./scheduler/sweeper";
import { PermanentError, RetryableError } from "./errors/order-errors";

const WORKER_ID = process.env.HOSTNAME || `worker-${Math.random()}`;

// Roda a cada 1 minuto para checar se há algo perdido há mais de 10 minutos
setInterval(() => {
  sweepLostOrders().catch(err => logger.error({ err }, "Erro no Sweeper"));
}, 60 * 1000);

async function start() {
  const worker = new Worker(
    "order-processing",
    async (job) => {
      const start = Date.now();
      const { orderId } = job.data;

      logger.info({ orderId }, "Processing order");

      // 🔒 claim do job
      const result = await db.query(
        `UPDATE orders
         SET status = 'processing',
             attempts = attempts + 1
         WHERE id = $1
           AND status != 'completed' -- Aceita processar se não estiver finalizado
         RETURNING *`,
        [orderId]
      );

      if (result.rowCount === 0) {
        logger.warn({ orderId }, "Order already processed or locked");
        return;
      }

      try {
        // 🔥 Tempo de processamento reduzido para 1 segundo
        await new Promise((r) => setTimeout(r, 1000));

        const random = Math.random();

        // 🛑 20% de chance: Erro permanente (0.0 a 0.19)
        if (random < 0.2) {
          await db.query(
            `UPDATE orders 
             SET status = 'failed', last_error = $1 
             WHERE id = $2`,
            ["Invalid payment data", orderId]
          );
          // Cancela próximas tentativas
          throw new UnrecoverableError("Invalid payment data");
        } 
        // ⚠️ 30% de chance: Erro de Timeout (0.2 a 0.49)
        else if (random < 0.5) {
          throw new RetryableError("Gateway timeout");
        }

        // ✅ Sucesso: Atualiza o status
        await db.query(
          `UPDATE orders 
           SET status = 'completed', last_error = NULL 
           WHERE id = $1`,
          [orderId]
        );

        const duration = Date.now() - start;

        if (isMetricsEnabled && jobsProcessed && jobDuration) {
          jobsProcessed.labels(workerId).inc();
          jobDuration.labels(workerId).observe(duration / 1000);
        }

        logger.info({ orderId, duration }, "Order processed successfully");

      } catch (err: any) {
        const duration = Date.now() - start;

        if (isMetricsEnabled && jobsFailed && jobDuration) {
          jobsFailed.labels(workerId).inc();
          jobDuration.labels(workerId).observe(duration / 1000);
        }

        logger.error(
          { orderId, duration, err: err.message },
          "Order processing failed"
        );

        // Se por algum motivo o erro nativo for disparado em vez do UnrecoverableError
        if (err instanceof PermanentError) {
          await db.query(
            `UPDATE orders 
             SET status = 'failed', last_error = $1 
             WHERE id = $2`,
            [err.message, orderId]
          );
          return;
        }

        // Repassa o erro para o BullMQ gerenciar as tentativas
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info(
      { orderId: job.data.orderId },
      "Job completed"
    );
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;

    logger.error({ orderId: job.data.orderId, err: err.message }, "Job failed");

    // 🔥 Falha definitiva se esgotar as tentativas configuradas (ex: 2)
    if (job.attemptsMade === job.opts.attempts && err.name !== 'UnrecoverableError') {
      await db.query(
        `UPDATE orders 
         SET status = 'failed',
             last_error = $1
         WHERE id = $2`,
        [err.message, job.data.orderId]
      );
      // O BullMQ já move o job para a fila "failed" nativamente, não precisamos fazer mais nada.
    }
  });
}

start();