import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { saveMessage, markDelivered } from "../services/messageService";

// yeh map userId ke against saare connected socketIds ko store karta hai
const userSocketMap: Map<string, Set<string>> = new Map();

// token verify karne ka function, jo userId return karega
const verifyToken = (token: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    // agar env me ACCESS_TOKEN_SECRET missing hai toh error throw karte hain
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }

  // jwt token verify karke payload se userId nikal rahe hain
  const decoded = jwt.verify(token, secret) as { userId: string };
  return decoded.userId;
};

export const setupSocket = (io: Server) => {
  // socket ke liye authentication middleware
  io.use((socket, next) => {
    try {
      // client ke auth data se token read kar rahe hain
      const token = socket.handshake.auth?.token;

      // agar token nahi mila toh connection reject kar dete hain
      if (!token) {
        return next(new Error("Token missing"));
      }

      // token verify karke userId le rahe hain
      const userId = verifyToken(token);

      // socket ke data object me userId save kar rahe hain
      socket.data.userId = userId;

      // sab theek hai toh aage badhne do
      next();
    } catch {
      // token invalid hone par authentication fail
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    // user ke liye socket id ka Set bana rahe hain agar pehle se nahi hai
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }

    // current socket id user ke Set me add kar rahe hain
    userSocketMap.get(userId)?.add(socket.id);

    console.log("User connected", userId, socket.id);

    // one-to-one message send event
    socket.on(
      "send_message",
      async (data: { receiverId: string; content: string }) => {
        const { receiverId, content } = data;

        // message ko database me save kar rahe hain
        const message = await saveMessage(userId, receiverId, content);

        // receiver ke saare active socket ids nikal rahe hain
        const receiverSockets = userSocketMap.get(receiverId);

        if (receiverSockets) {
          // receiver ke har socket par message emit kar rahe hain
          for (const socketId of receiverSockets) {
            io.to(socketId).emit("receive_message", message);
          }

          // sender ko notify kar rahe hain ki message deliver ho gaya
          socket.emit("message_delivered", {
            messageId: message._id
          });

          // database me message ko delivered mark kar rahe hain
          await markDelivered(message._id.toString());
        }
      }
    );

    // jab socket disconnect hota hai
    socket.on("disconnect", () => {
      const set = userSocketMap.get(userId);
      if (set) {
        // disconnect hone par socketId remove kar rahe hain
        set.delete(socket.id);

        // agar user ka koi active socket nahi bacha toh map se hata rahe hain
        if (set.size === 0) {
          userSocketMap.delete(userId);
        }
      }

      console.log("User disconnected", userId, socket.id);
    });
  });
};
