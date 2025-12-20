import jwt from "jsonwebtoken";

// yeh function env variable safely fetch karta hai
// agar value undefined ho to error throw karega
const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} missing in env`);
  }
  return value;
};

// access token banane ka function
// ye token short time ke liye valid hota hai
export const generateAccessToken = (userId: string): string => {
  const secret = getEnv("ACCESS_TOKEN_SECRET");

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: getEnv("ACCESS_TOKEN_EXPIRE") as any } // type casting taaki build fail na ho
  );
};

// refresh token banane ka function
// ye long time ke liye valid hota hai
export const generateRefreshToken = (userId: string): string => {
  const secret = getEnv("REFRESH_TOKEN_SECRET");

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: getEnv("REFRESH_TOKEN_EXPIRE") as any }
  );
};

// refresh token verify karne ka function
export const verifyRefreshToken = (token: string): string => {
  const secret = getEnv("REFRESH_TOKEN_SECRET");

  // token ko verify kar rahe hain
  const decoded = jwt.verify(token, secret) as { userId: string };

  // decoded object me userId hota hai
  return decoded.userId;
};