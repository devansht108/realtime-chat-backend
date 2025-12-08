import "./types/express"; 
// yeh import Express ke Request object ko globally extend karta hai
// isse hum req.userId jaisi custom properties bina TypeScript error ke use kar sakte hain

import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import "express-async-errors";
// yeh package async controllers me thrown errors ko automatically
// Express ke error handler tak forward kar deta hai

import conversationRoutes from "./routes/conversationRoutes";
import authRoutes from "./routes/authRoutes";

import errorHandler from "./middleware/errorHandler";

// .env file ke variables process.env me load karta hai
dotenv.config();

const app = express();

// incoming request ke JSON body ko parse karta hai
// POST/PUT requests me req.body access karne ke liye zaroori hai
app.use(express.json());

// CORS enable karta hai taaki different origins se requests allowed ho
app.use(cors());

// common security headers add karta hai (XSS, clickjacking protection, etc.)
app.use(helmet());

// har incoming request ka log console me print karta hai
// method, url, status code, response time, etc.
app.use(morgan("dev"));

// authentication related routes ko /api/auth prefix ke sath register kar rahe hain
// jaise login, register, refresh token
app.use("/api/auth", authRoutes);

// conversations aur messages related routes ko yahan mount kar rahe hain
app.use("/api/conversations", conversationRoutes);

// ek simple test route to check ki server properly kaam kar raha hai ya nahi
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API working!" });
});

// global error handler middleware
// koi bhi error jo upar ke middleware ya routes me throw hoga
// woh yahan catch hoke proper response me convert ho jayega
app.use(errorHandler);

export default app;
