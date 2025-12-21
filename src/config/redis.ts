import { Redis } from "ioredis";

// get host from docker env or default to localhost
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

// cloud redis (Upstash) ke liye REDIS_URL use hoga
const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl
  ? new Redis(redisUrl) // agar URL mila toh direct TLS redis use karo
  : new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null // required for queues
    });

// publisher client for socket.io
export const redisPublisher = redisUrl
  ? new Redis(redisUrl)
  : new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null
    });

// subscriber client
export const redisSubscriber = redisUrl
  ? new Redis(redisUrl)
  : new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null
    });

/*
  BullMQ ke liye alag Redis client banana zaroori hota hai
  kyunki BullMQ shared Redis connections accept nahi karta
  aur strict rule follow karta hai:
  maxRetriesPerRequest MUST be null
*/
export const bullmqRedis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null // BullMQ ke liye mandatory
    })
  : new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null // BullMQ ke liye mandatory
    });

// connection function called by server.ts
// (ab ioredis auto-connect karta hai, yeh sirf logging ke liye reh gaya hai)
export const connectRedis = async () => {
  console.log("Redis Service: Using ioredis auto-connection");
};

// log connection status for all clients
const clients = [redis, redisPublisher, redisSubscriber, bullmqRedis];
const names = ["Main Redis", "Publisher", "Subscriber", "BullMQ Redis"];

clients.forEach((client, index) => {
  client.on("connect", () => {
    console.log(`${names[index]} connected successfully`);
  });

  client.on("error", (err) => {
    console.error(`${names[index]} error:`, err);
  });
});
