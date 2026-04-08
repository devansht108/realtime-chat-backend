import { Server } from "socket.io";

// io instance ko globally store karte hain
// taaki workers aur other modules bhi use kar sakein
let ioInstance: Server | null = null;

export const setIO = (io: Server): void => {
  ioInstance = io;
};

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error("Socket.IO instance not initialized. Call setIO() first.");
  }
  return ioInstance;
};
