import { Request, Response, NextFunction } from "express";

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

// yeh interface ek custom error define karta hai jisme statusCode optional hota hai

// global error handler middleware
const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // err ko ErrorWithStatus type me cast kar rahe hain taaki statusCode aur message access ho sake
  const error = err as ErrorWithStatus;

  // server par error log karne ke liye
  console.error("Error:", error);

  // agar error ka statusCode mila toh use send karenge, warna 500 (server error)
  res.status(error.statusCode ?? 500).json({
    success: false,
    // error message agar present ho toh wahi bhejenge, warna default message
    message: error.message ?? "Server Error"
  });
};

export default errorHandler;
