import Redis from "ioredis";

// main client (lazyConnect = true means yeh tab tak connect nahi karega jab tak .connect() nahi bulayenge)
export const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true
});

// publisher client
export const redisPublisher = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true
});

// subscriber client
export const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true
});

// manual connect
export async function connectRedis() {
  try {
    await redis.connect();
    console.log("Redis main client connected");

    await redisPublisher.connect();
    console.log("Redis publisher connected");

    await redisSubscriber.connect();
    console.log("Redis subscriber connected");
  } catch (err) {
    console.error("Redis connection error:", err);
  }
}
