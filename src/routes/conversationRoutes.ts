import express from "express";
import type { RequestHandler, Request, Response } from "express";

// pehle ke controllers
import {
  getUserConversations,
  getMessages
} from "../controllers/conversationController";

// day 11 ka naya controller
import { getConversationList } from "../controllers/conversationListController";

import { protect } from "../middleware/authMiddleware";
import { addAnalysisJob } from "../queues/analysisQueue";
import Conversation from "../models/Conversation";

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

/*
  LLM Analysis: conversation ka async AI analysis trigger karne ka route
  Result Socket.IO event "conversation_analysis" ke through aayega
*/
router.post(
  "/:id/analyze",
  protect as unknown as RequestHandler,
  (async (req: Request, res: Response) => {
    const { id: conversationId } = req.params;
    const requestedByUserId = (req as any).user?.userId as string;

    // conversation exist karta hai aur user participant hai — verify karo
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: requestedByUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    // BullMQ queue me job daalo — response wait nahi karta
    await addAnalysisJob({ conversationId, requestedByUserId });

    // Immediately return — result Socket.IO se aayega
    return res.status(202).json({
      success: true,
      message: "Analysis queued. Listen for 'conversation_analysis' socket event.",
      conversationId,
    });
  }) as unknown as RequestHandler
);

export default router;