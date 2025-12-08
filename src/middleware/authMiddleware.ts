import type { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

// custom request type jisme hum auth object attach kar sakte hain
interface AuthRequest extends Request {
  auth: {
    userId: string;
  };
}

// env file se access token secret safely nikalne ka function
const getSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    // agar ACCESS_TOKEN_SECRET env me missing ho toh error throw karte hain
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }
  return secret;
};

export const protect = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  // request ke headers se authorization header nikal rahe hain
  const authHeader = req.headers.authorization;

  // agar authorization header missing hai ya Bearer se start nahi hota
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Not authorized");
  }

  // Bearer token ko header se extract kar rahe hain
  const token = authHeader.split(" ")[1];

  // token verify karke payload decode kar rahe hain
  const decoded = jwt.verify(token, getSecret()) as {
    userId: string;
  };

  // request me auth object attach kar rahe hain
  req.auth = {
    userId: decoded.userId
  };

  // sab kuch sahi hai toh next middleware ko call kar dete hain
  next();
};
