import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import {
  saveMessage,
  markDelivered,
  markRead,
} from "../services/messageService";
import { redis } from "../config/redis";
import { addEmailJob } from "../queues/emailQueue";

// userId ko multiple socket ids ke saath map karne ke liye
const userSocketMap: Map<string, Set<string>> = new Map();

// token verify karke userId nikalne ka helper function
const verifyToken = (token: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }

  const decoded = jwt.verify(token, secret) as { userId: string };
  return decoded.userId;
};

export const setupSocket = (io: Server) => {
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

    // user room join (SAFE, does not affect anything else)
    socket.join(userId);

    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socket.id);

    console.log("User connected", userId, socket.id);

    await redis.set(`user:${userId}:online`, "1");
    socket.broadcast.emit("user_online", { userId });

    socket.on(
      "send_message",
      async ({
        receiverId,
        content,
        clientId,
      }: {
        receiverId: string;
        content: string;
        clientId?: string;
      }) => {
        console.log("Received send_message event");

        try {
          const { message, conversation } = await saveMessage(
            userId,
            receiverId,
            content,
          );

          const cacheKey = `conversation:${conversation._id}:messages`;
          await redis.del(cacheKey);

          const receiverSockets = userSocketMap.get(receiverId);
          const senderSockets = userSocketMap.get(userId);

          const cleanMessage = {
            ...message.toObject(),
            _id: message._id.toString(),
            sender: message.sender.toString(),
            receiver: message.receiver.toString(),
            conversationId: message.conversationId.toString(),
            clientId,
          };

          if (receiverSockets && receiverSockets.size > 0) {
            for (const socketId of receiverSockets) {
              io.to(socketId).emit("receive_message", cleanMessage);
              io.to(socketId).emit("conversation_updated", {
                conversationId: conversation._id.toString(),
                lastMessage: cleanMessage,
                unreadCount: conversation.unreadCount.get(receiverId) || 0,
              });
            }
          } else {
            await addEmailJob({
              receiverId,
              senderId: userId,
              messageContent: content,
            });
          }

          if (senderSockets && senderSockets.size > 0) {
            for (const socketId of senderSockets) {
              io.to(socketId).emit("receive_message", cleanMessage);
              io.to(socketId).emit("conversation_updated", {
                conversationId: conversation._id.toString(),
                lastMessage: cleanMessage,
                unreadCount: 0,
              });
            }
          }

          socket.emit("message_delivered", {
            messageId: cleanMessage._id,
          });

          await markDelivered(
            cleanMessage._id,
            conversation._id.toString(),
            receiverId,
          );
        } catch (error) {
          console.error("Error in send_message:", error);
        }
      },
    );

    // message read karne ka event
    socket.on("message_read", async ({ messageId }: { messageId: string }) => {
      try {
        const result = await markRead(messageId, userId);
        if (!result) return;

        const senderId = String(result.senderId);
        const readerId = String(result.readerId);

        const senderSockets = userSocketMap.get(senderId);

        // direct socket emit
        if (senderSockets && senderSockets.size > 0) {
          for (const socketId of senderSockets) {
            io.to(socketId).emit("message_read", {
              messageId: String(messageId),
              readerId,
            });
          }
        }

        // fallback emit via room (guaranteed delivery)
        io.to(senderId).emit("message_read", {
          messageId: String(messageId),
          readerId,
        });
      } catch (err) {
        console.error("READ RECEIPT ERROR:", err);
      }
    });

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
