import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { Server } from "socket.io";
import { setupSocket } from "./sockets/socket";

// redis imports
import { createAdapter } from "@socket.io/redis-adapter";
import {
  redisPublisher,
  redisSubscriber,
  connectRedis
} from "./config/redis";

// port
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

// http server
const server = http.createServer(app);

// socket.io
const io = new Server(server, {
  cors: { origin: "*" }
});

async function startServer() {
  // connect redis clients
  await connectRedis();

  // attach redis adapter
  io.adapter(createAdapter(redisPublisher, redisSubscriber));
  console.log("Redis adapter is enabled");

  // socket setup
  setupSocket(io);

  // connect DB
  await connectDB();

  // start server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
