export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface Order {
  id: string;
  status: OrderStatus;
  amount: number;
  customer_id: string;
  attempts?: number;
  last_error?: string;
}