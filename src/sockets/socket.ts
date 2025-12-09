import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { saveMessage, markDelivered } from "../services/messageService";
import { redis } from "../config/redis";

// yeh map userId ke against saare connected socketIds ko store karta hai
// ek user ke multiple active connections ho sakte hain
const userSocketMap: Map<string, Set<string>> = new Map();

// token verify karne ka function jo token se userId nikal kar deta hai
const verifyToken = (token: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    // agar ACCESS_TOKEN_SECRET env variable missing hai toh error throw hoga
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }

  // jwt token verify karke uska payload decode kar rahe hain
  const decoded = jwt.verify(token, secret) as { userId: string };
  return decoded.userId;
};

export const setupSocket = (io: Server) => {
  // socket connection se pehle authentication middleware chalta hai
  io.use((socket, next) => {
    try {
      // client socket ke auth object se token read kar rahe hain
      const token = socket.handshake.auth?.token;

      // agar token nahi mila toh connection reject kar dete hain
      if (!token) {
        return next(new Error("Token missing"));
      }

      // token verify karke userId nikal rahe hain
      const userId = verifyToken(token);

      // socket object me userId store kar rahe hain
      socket.data.userId = userId;

      // authentication successful hone par next ko call karte hain
      next();
    } catch {
      // agar token invalid ho ya koi error aaye toh auth fail
      next(new Error("Auth failed"));
    }
  });

  // jab socket successfully connect ho jata hai
  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as string;

    // agar user ke liye pehle se socket Set nahi hai toh naya Set bana rahe hain
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }

    // current socket id user ke Set me add kar rahe hain
    userSocketMap.get(userId)?.add(socket.id);

    console.log("User connected", userId, socket.id);

    // Redis me user ko online mark kar rahe hain
    await redis.set(`user:${userId}:online`, "1");

    // baaki sabhi connected clients ko notify kar rahe hain ki user online aaya
    socket.broadcast.emit("user_online", { userId });

    // one-to-one message send karne ka event
    socket.on(
      "send_message",
      async (data: { receiverId: string; content: string }) => {
        const { receiverId, content } = data;

        // message ko database me save kar rahe hain
        const message = await saveMessage(userId, receiverId, content);

        // receiver ke saare active socket ids nikal rahe hain
        const receiverSockets = userSocketMap.get(receiverId);

        if (receiverSockets) {
          // har socket par message emit kar rahe hain
          for (const socketId of receiverSockets) {
            io.to(socketId).emit("receive_message", message);
          }

          // sender ko confirmation bhej rahe hain ki message deliver hua
          socket.emit("message_delivered", {
            messageId: message._id
          });

          // database me message ko delivered mark kar rahe hain
          await markDelivered(
            message._id.toString(),
            message.conversationId.toString(),
            receiverId
          );
        }
      }
    );

    // typing indicator event jab user likhna start karta hai
    socket.on("typing", ({ receiverId }) => {
      const receiverSockets = userSocketMap.get(receiverId);

      if (receiverSockets) {
        // receiver ke sockets ko notify kar rahe hain ki typing start hui
        for (const socketId of receiverSockets) {
          io.to(socketId).emit("typing", { userId });
        }
      }
    });

    // typing stop hone ka event
    socket.on("stop_typing", ({ receiverId }) => {
      const receiverSockets = userSocketMap.get(receiverId);

      if (receiverSockets) {
        // receiver ko notify kar rahe hain ki typing stop ho gayi
        for (const socketId of receiverSockets) {
          io.to(socketId).emit("stop_typing", { userId });
        }
      }
    });

    // jab socket disconnect hota hai
    socket.on("disconnect", async () => {
      const set = userSocketMap.get(userId);
      if (set) {
        // current socket id ko user ke socket Set se remove kar rahe hain
        set.delete(socket.id);

        // agar user ka koi bhi active socket nahi bacha
        if (set.size === 0) {
          userSocketMap.delete(userId);
        }
      }

      // Redis se user ko offline mark kar rahe hain
      await redis.del(`user:${userId}:online`);

      // baaki users ko notify kar rahe hain ki user offline ho gaya
      socket.broadcast.emit("user_offline", { userId });

      console.log("User disconnected", userId, socket.id);
    });
  });
};
