import { Redis } from "ioredis";

export const redisConnection = new Redis({
  host: "redis",
  port: 6379,
  maxRetriesPerRequest: null,
});