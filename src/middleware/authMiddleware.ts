import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

// custom request type jisme auth object store kar sakte hain
// isse hum decoded token ka userId request object me rakh sakte hain
// Request ke generics explicitly add kiye gaye hain taaki params, query, body types na tootey
export interface AuthRequest extends Request<any, any, any, any> {
  auth?: {
    userId: string;
  };
}

// env se JWT secret safely read karne ka function
const getSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    // agar secret missing hai toh application ke liye critical error hai
    throw new Error("ACCESS_TOKEN_SECRET missing");
  }
  return secret;
};

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // authorization header read kar rahe hain
    const authHeader = req.headers.authorization;

    // agar header missing hai ya format Bearer token jaisa nahi hai
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Bearer token string se actual token extract kar rahe hain
    const token = authHeader.split(" ")[1];

    // token ko verify karke uska payload decode kar rahe hain
    const decoded = jwt.verify(token, getSecret()) as {
      userId: string;
    };

    // request ko AuthRequest type me cast kar ke usme auth object set kar rahe hain
    // isse controllers directly req.auth.userId access kar sakte hain
    (req as AuthRequest).auth = {
      userId: decoded.userId
    };

    // authentication successful, next middleware ko call karte hain
    next();
  } catch (err) {
    // agar token invalid ya expired ho toh unauthorized response bhejte hain
    return res.status(401).json({ message: "Invalid token" });
  }
};
