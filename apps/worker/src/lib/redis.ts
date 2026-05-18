import IORedis from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/**
 * Creates a new IORedis connection with BullMQ-required options.
 * BullMQ mandates a dedicated connection per Worker and QueueEvents instance —
 * never share the subscriber connection used by a Worker with a Queue.
 */
export function createRedisConnection(): IORedis {
  const conn = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  conn.on("error", (err: Error) => logger.error({ err }, "Redis error"));
  conn.on("connect", () => logger.debug("Redis connected"));
  conn.on("close", () => logger.debug("Redis connection closed"));
  return conn;
}

/** Shared singleton for general-purpose use (e.g., publishing QR codes via pub/sub). */
export const redis = createRedisConnection();
