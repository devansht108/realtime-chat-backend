import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

// maximum number of requests allowed in the given time window
const RATE_LIMIT = 10;

// time window (TTL) in seconds
// iske baad Redis key automatically expire ho jayegi
const TTL = 60;

export const customRedisRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // request karne wale user ka IP address nikal rahe hain
  // agar kisi reason se IP nahi mila toh fallback use kar rahe hain
  const ip = req.ip || "unknown_ip";

  // Redis me har IP ke liye ek unique key bana rahe hain
  const key = `rate_limit:${ip}`;

  try {
    // Redis INCR command atomic hota h
    const requests = await redis.incr(key);

    // agar yeh first request hai toh expiry set kar rahe hain
    // taaki TTL ke baad count reset ho jaye
    if (requests === 1) {
      await redis.expire(key, TTL);
    }

    // agar requests allowed limit se zyada ho gayi
    // toh user ko block kar dete hain
    if (requests > RATE_LIMIT) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down."
      });
    }

    // agar limit ke andar hai toh request ko aage allow kar dete hain
    next();
  } catch (err) {
    // agar Redis down ho ya error aaye
    // toh user ko block nahi karenge
    console.error("Redis rate limiter error:", err);
    next();
  }
};
