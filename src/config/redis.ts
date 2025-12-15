import Redis from "ioredis";

/*
  ioredis clients
  inka use real-time features ke liye hota hai:
  - socket.io redis adapter
  - pub/sub events
  - user presence (online/offline)
  - rate limiting
*/

// main redis client
// yeh client auto-connect hota hai
export const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379
});

// publisher client (socket.io adapter ke liye)
export const redisPublisher = redis.duplicate();

// subscriber client (socket.io adapter ke liye)
export const redisSubscriber = redis.duplicate();

/*
  ioredis auto-connect karta hai
  yahan manually connect karne ki zarurat nahi
*/
export async function connectRedis() {
  return;
}
