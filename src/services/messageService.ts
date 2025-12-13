import Message from "../models/Message";
import Conversation from "../models/Conversation";

// message ko database me save karne ka function
export const saveMessage = async (
  senderId: string,
  receiverId: string,
  content: string
) => {
  // check kar rahe hain ki conversation already exist karti hai ya nahi
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] }
  });

  // agar conversation nahi mili toh nayi create kar rahe hain
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
      unreadCount: {}
    });
  }

  // naya message create kar rahe hain
  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    conversationId: conversation._id,
    content,

    // message lifecycle ka starting state
    status: "sent"
  });

  // conversation ka last message update kar rahe hain
  conversation.lastMessage = content;
  conversation.lastMessageAt = new Date();

  // receiver ke unread count ko increment kar rahe hain
  const currentUnread =
    conversation.unreadCount.get(receiverId) || 0;

  conversation.unreadCount.set(receiverId, currentUnread + 1);

  // conversation save kar rahe hain
  await conversation.save();

  // Day 12: message + conversation dono return kar rahe hain
  return {
    message,
    conversation
  };
};

// jab receiver online ho aur message deliver ho jaye
export const markDelivered = async (
  messageId: string,
  conversationId: string,
  receiverId: string
) => {
  // message ko delivered mark kar rahe hain
  await Message.findByIdAndUpdate(messageId, {
    status: "delivered",
    deliveredAt: new Date()
  });

  // conversation fetch kar rahe hain
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return;

  // receiver ka unread count reset kar rahe hain
  conversation.unreadCount.set(receiverId, 0);

  await conversation.save();
};

// jab user message read kar leta hai
export const markRead = async (
  messageId: string,
  readerId: string
) => {
  // message fetch kar rahe hain
  const message = await Message.findById(messageId);

  if (!message) return null;

  // status read mark kar rahe hain
  message.status = "read";
  message.readAt = new Date();

  await message.save();

  // socket ke liye minimal info return kar rahe hain
  return {
    messageId: message._id.toString(),
    readerId,
    senderId: message.sender.toString()
  };
};
