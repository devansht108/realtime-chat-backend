import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import {
  saveMessage,
  markDelivered,
  markRead
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
  // socket connection se pehle auth check karne ka middleware
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

    // agar user pehle se map me nahi hai to naya set banao
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    // user ka naya socket id add kar do
    userSocketMap.get(userId)!.add(socket.id);

    console.log("User connected", userId, socket.id);

    // redis me user ko online mark kar do
    await redis.set(`user:${userId}:online`, "1");

    // baaki sabko bata do ki ye user online aa gaya hai
    socket.broadcast.emit("user_online", { userId });

    // message send karne ka event
    socket.on(
      "send_message",
      async ({ receiverId, content }: { receiverId: string; content: string }) => {
        console.log("Received send_message event");

        try {
          // message aur conversation database me save kar rahe hain
          const { message, conversation } = await saveMessage(
            userId,
            receiverId,
            content
          );

          console.log("Message saved to DB");

          // naya message aate hi purani cache delete karni padegi
          const cacheKey = `conversation:${conversation._id}:messages`;
          await redis.del(cacheKey);
          console.log(`Cache invalidated for conversation: ${conversation._id}`);

          const receiverSockets = userSocketMap.get(receiverId);
          const senderSockets = userSocketMap.get(userId);

          // receiver ko message bhejo (agar wo online hai)
          if (receiverSockets && receiverSockets.size > 0) {
            for (const socketId of receiverSockets) {
              io.to(socketId).emit("receive_message", message);
              io.to(socketId).emit("conversation_updated", {
                conversationId: conversation._id,
                lastMessage: message,
                unreadCount: conversation.unreadCount.get(receiverId) || 0
              });
            }
          } else {
            // USER OFFLINE HAI: Queue me job add karo
            console.log(`User ${receiverId} is offline. Adding email job to queue.`);
            await addEmailJob({
              receiverId,
              senderId: userId,
              messageContent: content
            });
          }

          // sender ko bhi conversation update bhejna zaroori hai
          if (senderSockets) {
            for (const socketId of senderSockets) {
              io.to(socketId).emit("conversation_updated", {
                conversationId: conversation._id,
                lastMessage: message,
                unreadCount: 0
              });
            }
          }

          // sender ko confirm karo ki message server tak pahunch gaya
          socket.emit("message_delivered", {
            messageId: message._id
          });

          // database me status delivered update kar do
          await markDelivered(
            message._id.toString(),
            conversation._id.toString(),
            receiverId
          );
        } catch (error) {
          console.error("Error in send_message:", error);
        }
      }
    );

    // message read karne ka event
    socket.on(
      "message_read",
      async ({ messageId }: { messageId: string }) => {
        const result = await markRead(messageId, userId);
        if (!result) return;

        const { senderId, readerId } = result;

        const senderSockets = userSocketMap.get(senderId);
        if (!senderSockets) return;

        // sender ko batao ki message padh liya gaya hai
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