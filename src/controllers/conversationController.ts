import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import { getManyUsersStatus } from "../services/presenceService";

// typed request jisme auth object available hai
interface AuthRequest extends Request {
  auth: {
    userId: string;
  };
}

// logged-in user ke conversations fetch karna
export const getUserConversations = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.auth.userId;

  // user ke saare conversations fetch kar rahe hain
  const conversations = await Conversation.find({
    participants: userId
  })
    .sort({ lastMessageAt: -1 })
    .populate("participants", "username email");

  // sab participant ids collect kar rahe hain (except self)
  const otherUserIds: string[] = [];

  conversations.forEach(conv => {
    conv.participants.forEach((p: any) => {
      if (p._id.toString() !== userId) {
        otherUserIds.push(p._id.toString());
      }
    });
  });

  // Redis se online + lastSeen status fetch kar rahe hain
  const statuses = await getManyUsersStatus(otherUserIds);

  // map banaya for quick lookup
  const statusMap = new Map(
    statuses.map(s => [s.userId, s])
  );

  // final response format
  const formatted = conversations.map(conv => {
    const otherUser = conv.participants.find(
      (p: any) => p._id.toString() !== userId
    ) as any;

    const status = statusMap.get(otherUser._id.toString());

    return {
      conversationId: conv._id,
      participants: [otherUser],
      lastMessage: conv.lastMessage,
      online: status?.online ?? false,
      lastSeen: status?.lastSeen ?? null
    };
  });

  res.json({
    success: true,
    conversations: formatted
  });
};

// cursor-based messages pagination
export const getMessages = async (
  req: AuthRequest,
  res: Response
) => {
  const { conversationId } = req.params;
  const before = req.query.before as string | undefined;

  const limit = 20;

  // base query
  const query: any = { conversationId };

  // agar cursor diya hai to usse pehle ke messages
  if (before) {
    query._id = { $lt: before };
  }

  // messages fetch kar rahe hain (latest first)
  const messages = await Message.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1);

  // check kar rahe hain next page exist karta hai ya nahi
  const hasMore = messages.length > limit;

  if (hasMore) {
    messages.pop();
  }

  // next cursor last message ka _id hoga
  const nextCursor =
    messages.length > 0
      ? messages[messages.length - 1]._id
      : null;

  res.json({
    success: true,
    messages: messages.reverse(), // oldest → newest
    nextCursor
  });
};
