import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { Server } from "socket.io";
import { setupSocket } from "./sockets/socket";
import "./workers/emailWorker";

// Redis adapter related imports
// yeh socket.io ko Redis ke through scale karne ke liye use hota hai
import { createAdapter } from "@socket.io/redis-adapter";
import {
  redisPublisher,
  redisSubscriber,
  connectRedis
} from "./config/redis";

// server ka port env se le rahe hain, warna default 8000
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

// express app ke upar HTTP server create kar rahe hain
const server = http.createServer(app);

// socket.io server initialize kar rahe hain
const io = new Server(server, {
  cors: { origin: "*" } // filhaal sab origins allow kar rahe hain
});

async function startServer() {
  // node-redis client ko connect kar rahe hain
  // yeh sirf rate limiting ke liye use hota hai
  await connectRedis();

  // socket.io ke liye Redis adapter attach kar rahe hain
  // yeh ioredis publisher aur subscriber use karta hai
  io.adapter(createAdapter(redisPublisher, redisSubscriber));
  console.log("Redis adapter is enabled");

  // socket events aur authentication setup kar rahe hain
  setupSocket(io);

  // MongoDB database se connection establish kar rahe hain
  await connectDB();

  // HTTP server ko start kar rahe hain
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// server startup function call kar rahe hain
startServer();
