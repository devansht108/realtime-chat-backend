import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import "express-async-errors";
import authRoutes from "./routes/authRoutes";


import errorHandler from "./middleware/errorHandler";

dotenv.config();

const app = express();

// json body ko parse karta hai
app.use(express.json());

// cors enable karta hai
app.use(cors());

// security headers add karta hai
app.use(helmet());

// request logs print karta hai
app.use(morgan("dev"));

// auth routes use kar rahe hain
app.use("/api/auth", authRoutes);


// test route to check server
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API working!" });
});

// global error handler
app.use(errorHandler);

export default app;
