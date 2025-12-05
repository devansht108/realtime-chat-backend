import bcrypt from "bcrypt";
import User, { IUserDocument } from "../models/User";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/generateTokens";

// user register service
export const register = async (username: string, email: string, password: string): Promise<IUserDocument> => {
  // check kar rahe hain ki email already DB me hai ya nahi
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // password ko hash kar rahe hain security ke liye
  const hashedPassword = await bcrypt.hash(password, 10);

  // naya user create karke DB me save kar rahe hain
  const user = await User.create({
    username,
    email,
    password: hashedPassword
  });

  return user;
};

// user login service
export const login = async (email: string, password: string) => {
  // email se user find kar rahe hain
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  // user ke password ko verify kar rahe hain
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Incorrect password");
  }

  // successful login par access & refresh tokens generate kar rahe hain
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  return {
    message: "Login successful",
    accessToken,
    refreshToken,
    user
  };
};

// refresh token service
export const refresh = async (token: string) => {
  // refresh token ko verify karke userId nikal rahe hain
  const userId = verifyRefreshToken(token);

  // naya access token generate kar rahe hain
  const newAccessToken = generateAccessToken(userId);

  // naya refresh token bhi generate kar rahe hain
  const newRefreshToken = generateRefreshToken(userId);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
};
