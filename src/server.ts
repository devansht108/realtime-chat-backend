import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { Server } from "socket.io";
import { setupSocket } from "./sockets/socket";

// port ko env file se read kar rahe hain, warna default 8000
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

// express app ke saath http server create kar rahe hain
const server = http.createServer(app);

// http server ke upar socket.io server attach kar rahe hain
const io = new Server(server, {
  cors: {
    origin: "*" // filhaal sab origins allow kar rahe hain
  }
});

// socket related saara setup yahin se initialize hoga
setupSocket(io);

// server start hone par pehle DB connect karte hain
server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});
