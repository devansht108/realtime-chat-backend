import { Request, Response } from "express";
import { getUserConversations as getUserConversationsService } from "../services/conversationService";

// ek user ki conversation list fetch karne ka controller
export async function getConversationList(req: any, res: Response) {
  try {
    const userId = req.auth.userId;

    const data = await getUserConversationsService(userId);

    return res.json({
      success: true,
      conversations: data
    });
  } catch (err) {
    console.error("Conversation list error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}
