import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";

// yeh map har userId ke saare active socket ids ko store karega
const userSocketMap: Map<string, Set<string>> = new Map();

// yeh function access token verify karke userId return karta hai
const verifyToken = (token: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    // agar env me secret missing ho toh error throw kar dete hain
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }

  // jwt token verify karke payload se userId nikal rahe hain
  const decoded = jwt.verify(token, secret) as { userId: string };
  return decoded.userId;
};

// socket.io setup function
export const setupSocket = (io: Server) => {
  // yeh middleware har socket connection se pehle chalega
  io.use((socket, next) => {
    try {
      // client se auth object ke andar token aa raha hai
      const token = socket.handshake.auth?.token;

      // agar token nahi mila toh connection reject
      if (!token) {
        return next(new Error("Token missing"));
      }

      // token verify karke userId le rahe hain
      const userId = verifyToken(token);

      // socket ke data object me userId store kar rahe hain
      socket.data.userId = userId;

      // sab sahi hai toh connection allow kar do
      next();
    } catch (error) {
      // token invalid ya koi aur error hua toh auth fail
      next(new Error("Auth failed"));
    }
  });

  // jab client successfully connect ho jata hai
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    // agar user pehli baar connect ho raha hai toh ek naya Set bana rahe hain
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }

    // current socket id ko user ke Set me add kar rahe hain
    userSocketMap.get(userId)?.add(socket.id);

    console.log("User connected:", userId, "Socket:", socket.id);

    // jab client disconnect kare
    socket.on("disconnect", () => {
      const set = userSocketMap.get(userId);
      if (set) {
        // disconnect hone par socket id remove kar rahe hain
        set.delete(socket.id);

        // agar user ki koi bhi active socket nahi bachi toh entry hata denge
        if (set.size === 0) {
          userSocketMap.delete(userId);
        }
      }

      console.log("User disconnected:", userId, "Socket:", socket.id);
    });
  });
};
