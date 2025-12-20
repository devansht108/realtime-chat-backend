import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import { getManyUsersStatus } from "../services/presenceService";
import { redis } from "../config/redis";
import { addEmailJob } from "../queues/emailQueue";

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

  // sabse pehle check karo ki kya messages redis cache mein hain agar hain to database call skip karke wahi se return kar do
  // hum sirf first page ko cache kar rahe hain jab before parameter nahi hota
  const cacheKey = `conversation:${conversationId}:messages`;
  
  if (!before) {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }
  }

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

  const finalResponse = {
    success: true,
    messages: messages.reverse(), // oldest → newest
    nextCursor
  };

  // agar ye first page hai to database se aaye hue response ko redis mein save kar do taaki agli baar jaldi mil jaaye hum 60 seconds ka expiry time laga rahe hain
  if (!before) {
    await redis.set(cacheKey, JSON.stringify(finalResponse), "EX", 60);
  }

  res.json(finalResponse);
};

export const sendMessage = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { conversationId, receiverId, content } = req.body;
    const senderId = req.auth.userId;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // naya message create kar rahe hain
    const newMessage = await Message.create({
      conversationId,
      sender: senderId,
      content,
      read: false
    });

    // conversation ka last message update kar rahe hain
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content,
      lastMessageAt: new Date()
    });

    // messages ki cache invalidate kar rahe hain taaki naya message dikhe
    const cacheKey = `conversation:${conversationId}:messages`;
    await redis.del(cacheKey);

    // redis se receiver ka status check kar rahe hain
    const isOnline = await redis.get(`user:${receiverId}:online`);

    // agar receiver offline hai to email queue mein job add kar do
    if (!isOnline) {
      console.log(`User ${receiverId} is offline. Auto-queuing email...`);
      await addEmailJob({
        receiverId,
        senderId,
        messageContent: content
      });
    }

    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};