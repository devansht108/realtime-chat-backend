import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import "express-async-errors";
// yeh package async routes/controllers me throw hone wale errors
// ko automatically global error handler tak forward karta hai

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import userStatusRoutes from "./routes/userStatusRoutes";
import conversationRoutes from "./routes/conversationRoutes";

import errorHandler from "./middleware/errorHandler";
import { customRedisRateLimiter } from "./middleware/customRateLimiter";

// .env file ke environment variables load kar rahe hain
dotenv.config();

const app = express();

// incoming requests ke JSON body ko parse karta hai
// req.body use karne ke liye zaroori hai
app.use(express.json());

// CORS enable karta hai taaki frontend alag origin se API call kar sake
app.use(cors());

// security related HTTP headers add karta hai
// jaise XSS protection, clickjacking prevention, etc.
app.use(helmet());

// har incoming request ka log console me print karta hai
// method, URL, status code, response time, etc.
app.use(morgan("dev"));

/*
  AUTH ROUTES
  - login, register jaise sensitive routes
  - custom Redis based rate limiter apply kiya gaya hai
  - brute force aur abuse se protection ke liye
*/
app.use("/api/auth", customRedisRateLimiter, authRoutes);

// conversations aur messages related routes
app.use("/api/conversations", conversationRoutes);

// user related routes
// jaise profile, last seen, user status, etc.
app.use("/api/users", userRoutes);
app.use("/api/users", userStatusRoutes);

// simple health check route
// server properly chal raha hai ya nahi check karne ke liye
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API working!" });
});

// global error handling middleware
// kisi bhi route ya middleware me error throw hone par
// yahin se centralized response bheja jayega
app.use(errorHandler);

export default app;
