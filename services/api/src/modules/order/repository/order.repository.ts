import { db } from "../../../config/db";
import { Order } from "../entity/order";

export class OrderRepository {
  async create(order: Order) {
    const result = await db.query(
      `INSERT INTO orders (id, status, amount, customer_id, attempts)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        order.id,
        order.status,
        order.amount,
        order.customer_id,
        order.attempts ?? 0,
      ]
    );

    return result.rows[0];
  }
}