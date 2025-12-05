import express from "express";
import { registerUser, loginUser, refreshToken } from "../controllers/authController";

const router = express.Router();

// user register route
router.post("/register", registerUser); 
// In my app.ts (later), I will  say: app.use("/api/auth", authRoutes).

// That means the actual full URL for this route will be: http://localhost:8000/api/auth/register.

// registerUser: This is the function that will actually run.

// user login route
router.post("/login", loginUser);

// refresh token route
router.post("/refresh", refreshToken);

export default router;
