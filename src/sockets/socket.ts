import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import {
  saveMessage,
  markDelivered,
  markRead
} from "../services/messageService";
import { redis } from "../config/redis";

// userId -> multiple active socket ids
const userSocketMap: Map<string, Set<string>> = new Map();

// token verify karke userId nikalna
const verifyToken = (token: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }

  const decoded = jwt.verify(token, secret) as { userId: string };
  return decoded.userId;
};

export const setupSocket = (io: Server) => {
  // socket auth middleware
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

    // user ke active sockets track karna
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socket.id);

    console.log("User connected", userId, socket.id);

    // redis me online mark
    await redis.set(`user:${userId}:online`, "1");

    socket.broadcast.emit("user_online", { userId });

    // message send
    socket.on(
      "send_message",
      async ({ receiverId, content }: { receiverId: string; content: string }) => {

        //message + conversation dono milte hain
        const { message, conversation } = await saveMessage(
          userId,
          receiverId,
          content
        );

        const receiverSockets = userSocketMap.get(receiverId);
        const senderSockets = userSocketMap.get(userId);

        // receiver ko message bhejna
        if (receiverSockets) {
          for (const socketId of receiverSockets) {
            io.to(socketId).emit("receive_message", message);

            // conversation list update for receiver
            io.to(socketId).emit("conversation_updated", {
              conversationId: conversation._id,
              lastMessage: message,
              unreadCount: conversation.unreadCount.get(receiverId) || 0
            });
          }
        }

        // sender ko conversation update bhejna
        if (senderSockets) {
          for (const socketId of senderSockets) {
            io.to(socketId).emit("conversation_updated", {
              conversationId: conversation._id,
              lastMessage: message,
              unreadCount: 0
            });
          }
        }

        // sender ko delivery confirmation
        socket.emit("message_delivered", {
          messageId: message._id
        });

        // delivered mark karna
        await markDelivered(
          message._id.toString(),
          conversation._id.toString(),
          receiverId
        );
      }
    );

    // message read
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

    // typing start
    socket.on("typing", ({ receiverId }) => {
      const receiverSockets = userSocketMap.get(receiverId);
      if (!receiverSockets) return;

      for (const socketId of receiverSockets) {
        io.to(socketId).emit("typing", { userId });
      }
    });

    // typing stop
    socket.on("stop_typing", ({ receiverId }) => {
      const receiverSockets = userSocketMap.get(receiverId);
      if (!receiverSockets) return;

      for (const socketId of receiverSockets) {
        io.to(socketId).emit("stop_typing", { userId });
      }
    });

    // disconnect
    socket.on("disconnect", async () => {
      const set = userSocketMap.get(userId);

      if (set) {
        set.delete(socket.id);

        if (set.size === 0) {
          userSocketMap.delete(userId);

          await redis.del(`user:${userId}:online`);
          await redis.set(`user:${userId}:lastSeen`, Date.now().toString());

          socket.broadcast.emit("user_offline", { userId });
        }
      }

      console.log("User disconnected", userId, socket.id);
    });
  });
};
