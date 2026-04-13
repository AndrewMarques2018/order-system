import { db } from "../config/db";
import { logger } from "../config/logger";
import { orderQueue } from "../infra/queue";
import { acquireLock } from "../utils/lock"; // Supondo que você ainda tenha aquele utilitário

export async function sweepLostOrders() {
  // O Lock garante que, se você tiver 3 workers, apenas UM deles vai rodar a varredura por vez
  const lock = await acquireLock("sweeper-lock", 55);
  if (!lock) return;

  logger.info("Executando varredura de pedidos perdidos (Sweeper)...");

  // Busca pedidos que estão 'pending' ou 'processing' há mais de 10 minutos
  const result = await db.query(`
    SELECT id, status 
    FROM orders
    WHERE status IN ('pending', 'processing')
      AND created_at <= NOW() - interval '10 minutes'
    FOR UPDATE SKIP LOCKED
    LIMIT 100;
  `);

  const lostOrders = result.rows;

  if (lostOrders.length === 0) {
    return;
  }

  logger.warn({ count: lostOrders.length }, "Pedidos perdidos encontrados. Reenviando para a fila...");

  for (const order of lostOrders) {
    // 1. Volta o status para pending (caso estivesse travado em processing)
    // Isso é importante para o worker aceitar processar depois
    await db.query(`
      UPDATE orders 
      SET status = 'pending' 
      WHERE id = $1
    `, [order.id]);

    // 2. Coloca na fila novamente
    await orderQueue.add(
      "process-order",
      { orderId: order.id },
      { 
        jobId: order.id, // Evita duplicação no próprio Redis
        attempts: 2
      }
    );

    logger.info({ orderId: order.id, previousStatus: order.status }, "Pedido resgatado com sucesso");
  }
}