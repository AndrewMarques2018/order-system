import { randomUUID } from "crypto";
import { OrderRepository } from "../repository/order.repository";
import { Order } from "../entity/order";
import { orderQueue } from "../../../infra/queue/order.queue";

type CreateOrderInput = {
  amount: number;
  customer_id: string;
};

export class OrderService {
  constructor(private repo: OrderRepository) {}

  async createOrder(data: CreateOrderInput) {
    const order: Order = {
      id: randomUUID(),
      status: "pending",
      amount: data.amount,
      customer_id: data.customer_id,
      attempts: 0,
    };

    const created = await this.repo.create(order);

    // envia para fila (assíncrono)
    await orderQueue.add(
      "process-order",
      { orderId: created.id },
      {
        jobId: order.id,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 500,
        },
      }
    );

    return created;
  }
}