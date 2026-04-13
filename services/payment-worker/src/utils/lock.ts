import { redisConnection } from "../config/redis";

export async function acquireLock(key: string, ttl = 60) {
    const result = await redisConnection.set(
        key,
        "locked",
        "EX",
        ttl,
        "NX"
    );

    return result === "OK";
}