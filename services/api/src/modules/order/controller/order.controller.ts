import { FastifyInstance } from "fastify";
import { OrderRepository } from "../repository/order.repository";
import { OrderService } from "../service/order.service";

// DTO de entrada
type CreateOrderBody = {
  amount: number;
  customer_id: string;
};

// DTO de saída (evita vazar tudo da entidade)
type OrderResponse = {
  id: string;
  status: string;
  amount: number;
  customer_id: string;
};

export async function orderRoutes(app: FastifyInstance) {
  const repo = new OrderRepository();
  const service = new OrderService(repo);

  app.post<{ Body: CreateOrderBody; Reply: OrderResponse }>(
    "/orders",
    {
      schema: {
        body: {
          type: "object",
          required: ["amount", "customer_id"],
          properties: {
            amount: { type: "number" },
            customer_id: { type: "string" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              status: { type: "string" },
              amount: { type: "number" },
              customer_id: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const order = await service.createOrder(request.body);

      // mapeia saída (não expõe tudo da entidade)
      const response: OrderResponse = {
        id: order.id,
        status: order.status,
        amount: order.amount,
        customer_id: order.customer_id,
      };

      return reply.status(201).send(response);
    }
  );
}