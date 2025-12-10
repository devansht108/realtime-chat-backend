import { Request, Response } from "express";
import User from "../models/User";
import { redis } from "../config/redis";

// ek user ka online status aur last seen time fetch karne wala controller
export const getLastSeen = async (
  req: Request,
  res: Response
) => {
  // URL params se userId read kar rahe hain
  const { userId } = req.params;

  // agar userId params me nahi mila toh bad request return kar rahe hain
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId missing in params"
    });
  }

  // Redis me pehle check kar rahe hain ki user online hai ya nahi
  // agar key exist karti hai toh user online mana jayega
  const onlineKey = `user:${userId}:online`;
  const isOnline = await redis.exists(onlineKey);

  // agar user abhi online hai toh lastSeen null bhejte hain
  if (isOnline) {
    return res.json({
      success: true,
      userId,
      online: true,
      lastSeen: null
    });
  }

  // agar user online nahi hai toh MongoDB se lastSeen time nikal rahe hain
  const user = await User.findById(userId).select("lastSeen");

  // agar user MongoDB me bhi exist nahi karta
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // offline user ka lastSeen time response me bhej rahe hain
  return res.json({
    success: true,
    userId,
    online: false,
    lastSeen: user.lastSeen
  });
};
