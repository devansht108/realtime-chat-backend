import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import Message from "../models/Message";

// local typed request jisme auth object available hai
interface AuthRequest extends Request {
  auth: {
    userId: string;
  };
}

// user ke saare conversations fetch karne ka controller
export const getUserConversations = async (
  req: AuthRequest,
  res: Response
) => {
  // auth middleware se aaya hua logged-in userId le rahe hain
  const userId = req.auth.userId;

  // us user ke saare conversations nikal rahe hain
  const conversations = await Conversation.find({
    participants: userId // jisme user participant ho
  })
    // latest message wali conversation upar aayegi
    .sort({ lastMessageAt: -1 })
    // participants ke basic details populate kar rahe hain
    .populate("participants", "username email");

  // conversations ko response me bhej rahe hain
  res.json(conversations);
};

// kisi ek conversation ke messages pagination ke sath
export const getMessages = async (
  req: AuthRequest,
  res: Response
) => {
  // URL params se conversationId le rahe hain
  const { conversationId } = req.params;

  // query params se page aur limit read kar rahe hain
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  // conversation ke messages database se fetch kar rahe hain
  const messages = await Message.find({ conversationId })
    // newest messages pehle aayenge
    .sort({ createdAt: -1 })
    // pagination ke liye skip
    .skip((page - 1) * limit)
    // ek page me kitne messages chahiye
    .limit(limit);

  // messages ko oldest to newest order me bhejne ke liye reverse kar rahe hain
  res.json(messages.reverse());
};
