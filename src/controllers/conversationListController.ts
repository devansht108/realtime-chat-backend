import { Request, Response } from "express";
import { getUserConversations } from "../services/conversationService";

// ek user ki conversation list fetch karne ka controller
export async function getConversationList(req: any, res: Response) {
  try {
    // protect middleware ke through decoded userId access kar rahe hain
    const userId = req.auth.userId;

    // service ko call karke user ki saari conversations fetch kar rahe hain
    const data = await getUserConversations(userId);

    // response me success flag aur conversation list bhej rahe hain
    return res.json({
      success: true,
      conversations: data
    });
  } catch (err) {
    // agar koi error aaye toh console me print kar rahe hain
    console.error("Conversation list error:", err);

    // client ko generic server error response bhej rahe hain
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}
