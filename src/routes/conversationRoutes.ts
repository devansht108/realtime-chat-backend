import express from "express";
import type { RequestHandler } from "express";
import {
  getUserConversations,
  getMessages
} from "../controllers/conversationController";
import { protect } from "../middleware/authMiddleware";

// express router create kar rahe hain
const router = express.Router();

// logged-in user ke saare conversations fetch karne ka route
router.get(
  "/",
  // protect middleware ko RequestHandler type me force-cast kar rahe hain
  // taaki TypeScript overload error na aaye
  protect as unknown as RequestHandler,

  // controller ko bhi RequestHandler type me cast kar rahe hain
  // kyunki controller me custom req properties (userId) use ho rahe hain
  getUserConversations as unknown as RequestHandler
);

// specific conversation ke messages pagination ke saath fetch karne ka route
router.get(
  "/:conversationId/messages",
  // auth middleware ke liye same casting apply ki hai
  protect as unknown as RequestHandler,

  // messages controller ko bhi Express-compatible handler bana rahe hain
  getMessages as unknown as RequestHandler
);

export default router;
