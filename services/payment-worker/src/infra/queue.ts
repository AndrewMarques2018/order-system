import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const orderQueue = new Queue("order-processing", {
  connection: redisConnection,
});