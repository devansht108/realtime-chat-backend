import { Redis } from "ioredis";

// get host from docker env or default to localhost
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

const redisConfig = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null // required for queues
};

// 1. general purpose redis client
export const redis = new Redis(redisConfig);

// 2. publisher client for socket.io
export const redisPublisher = new Redis(redisConfig);

// 3. subscriber client for socket.io
export const redisSubscriber = new Redis(redisConfig);

// connection function called by server.ts
export const connectRedis = async () => {
  console.log(`Redis Service: Connecting to ${redisHost}:${redisPort}...`);
};

// log connection status for all clients
const clients = [redis, redisPublisher, redisSubscriber];
const names = ["Main Redis", "Publisher", "Subscriber"];

clients.forEach((client, index) => {
  client.on("connect", () => {
    console.log(`${names[index]} connected successfully`);
  });

  client.on("error", (err) => {
    console.error(`${names[index]} error:`, err);
  });
});