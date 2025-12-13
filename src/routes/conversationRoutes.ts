import express from "express";
import type { RequestHandler } from "express";

// pehle ke controllers
import {
  getUserConversations,
  getMessages
} from "../controllers/conversationController";

// day 11 ka naya controller
import { getConversationList } from "../controllers/conversationListController";

import { protect } from "../middleware/authMiddleware";

const router = express.Router();

/*
  logged-in user ke saare conversations fetch karne ka route (old)
*/
router.get(
  "/",
  protect as unknown as RequestHandler,
  getUserConversations as unknown as RequestHandler
);

/*
  specific conversation ke messages pagination ke saath fetch karne ka route
*/
router.get(
  "/:conversationId/messages",
  protect as unknown as RequestHandler,
  getMessages as unknown as RequestHandler
);

/*
  DAY 11: user ke liye conversation list laane ka naya clean endpoint
  isme: last message, participant info, online/lastSeen sab aayega
*/
router.get(
  "/list",
  protect as unknown as RequestHandler,
  getConversationList as unknown as RequestHandler
);

export default router;
