import { Request, Response } from "express";
import * as authService from "../services/authService";

// register user controller
export const registerUser = async (req: Request, res: Response) => {
  // body se user data le rahe hain (username, email, password)
  const { username, email, password } = req.body;

  // authService me register function ko call karke naya user create kar rahe hain
  const result = await authService.register(username, email, password);

  // user create ho gaya toh success response bhej rahe hain
  res.status(201).json({
    message: "User registered successfully",
    user: result
  });
};

// login user controller
export const loginUser = async (req: Request, res: Response) => {
  // login credentials body se le rahe hain
  const { email, password } = req.body;

  // authService login function ko call kar rahe hain for token generation
  const result = await authService.login(email, password);

  // login successful hote hi response bhej dete hain
  res.status(200).json(result);
};

// refresh token controller
export const refreshToken = async (req: Request, res: Response) => {
  // body me user ka refresh token aata hai
  const { refreshToken } = req.body;

  // authService refresh function ko call karke new access token generate kar rahe hain
  const result = await authService.refresh(refreshToken);

  // updated tokens ko response me bhej rahe hain
  res.status(200).json(result);
};
