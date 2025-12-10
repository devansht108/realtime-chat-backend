import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import {
  saveMessage,
  markDelivered,
  markRead
} from "../services/messageService";
import { redis } from "../config/redis";

// Map userId -> multiple active socketIds
const userSocketMap: Map<string, Set<string>> = new Map();

// Verify JWT and extract userId
const verifyToken = (token: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }

  const decoded = jwt.verify(token, secret) as { userId: string };
  return decoded.userId;
};

export const setupSocket = (io: Server) => {
  // Socket auth middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Token missing"));

      const userId = verifyToken(token);
      socket.data.userId = userId;

      next();
    } catch {
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Track active sockets
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socket.id);

    console.log("User connected", userId, socket.id);

    // Mark user online in Redis
    await redis.set(`user:${userId}:online`, "1");
    socket.broadcast.emit("user_online", { userId });

    // Send message
    socket.on(
      "send_message",
      async ({ receiverId, content }: { receiverId: string; content: string }) => {
        const message = await saveMessage(userId, receiverId, content);

        const receiverSockets = userSocketMap.get(receiverId);
        if (receiverSockets) {
          for (const socketId of receiverSockets) {
            io.to(socketId).emit("receive_message", message);
          }

          socket.emit("message_delivered", {
            messageId: message._id
          });

          await markDelivered(
            message._id.toString(),
            message.conversationId.toString(),
            receiverId
          );
        }
      }
    );

    // Message read event
    socket.on(
      "message_read",
      async ({ messageId }: { messageId: string }) => {
        const result = await markRead(messageId, userId);
        if (!result) return;

        const { senderId, readerId } = result;

        const senderSockets = userSocketMap.get(senderId);
        if (!senderSockets) return;

        for (const socketId of senderSockets) {
          io.to(socketId).emit("message_read", {
            messageId,
            readerId
          });
        }
      }
    );

    // Typing indicator
    socket.on("typing", ({ receiverId }) => {
      const receiverSockets = userSocketMap.get(receiverId);
      if (!receiverSockets) return;

      for (const socketId of receiverSockets) {
        io.to(socketId).emit("typing", { userId });
      }
    });

    socket.on("stop_typing", ({ receiverId }) => {
      const receiverSockets = userSocketMap.get(receiverId);
      if (!receiverSockets) return;

      for (const socketId of receiverSockets) {
        io.to(socketId).emit("stop_typing", { userId });
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      const set = userSocketMap.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSocketMap.delete(userId);
        }
      }

      await redis.del(`user:${userId}:online`);
      socket.broadcast.emit("user_offline", { userId });

      console.log("User disconnected", userId, socket.id);
    });
  });
};
