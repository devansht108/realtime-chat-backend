import Message from "../models/Message";
import Conversation from "../models/Conversation";

// message ko database me save karne ka function
export const saveMessage = async (
  senderId: string,
  receiverId: string,
  content: string
) => {
  // pehle check kar rahe hain ki sender aur receiver ke beech conversation exist karti hai ya nahi
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] }
  });

  // agar conversation nahi mili toh nayi conversation create kar rahe hain
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
      unreadCount: {}
    });
  }

  // naya message create karke database me save kar rahe hain
  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    conversationId: conversation._id,
    content,

    // Day 7: message lifecycle ka starting state
    status: "sent"
  });

  // conversation ke last message details update kar rahe hain
  conversation.lastMessage = content;
  conversation.lastMessageAt = new Date();

  // receiver ke unread messages ka count badha rahe hain
  const currentUnread =
    conversation.unreadCount.get(receiverId) || 0;

  conversation.unreadCount.set(receiverId, currentUnread + 1);

  await conversation.save();

  return message;
};

// jab receiver online ho aur message deliver ho jaye
export const markDelivered = async (
  messageId: string,
  conversationId: string,
  receiverId: string
) => {
  // message ko delivered state me update kar rahe hain
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
  // messageId ke basis par message ko database se fetch kar rahe hain
  const message = await Message.findById(messageId);

  // agar message exist nahi karta toh null return kar dete hain
  if (!message) return null;

  // message ka status read mark kar rahe hain
  message.status = "read";

  // message read hone ka timestamp save kar rahe hain
  message.readAt = new Date();

  // updated message ko database me save kar rahe hain
  await message.save();

  // minimal data return kar rahe hain socket notification ke liye
  return {
    messageId: message._id.toString(), // read hua message ka id
    readerId, // jis user ne message read kiya
    senderId: message.sender.toString() // message bhejne wale ka userId
  };
};
