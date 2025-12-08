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
      unreadCount: {} // initially unread count blank rakha hai
    });
  }

  // naya message create karke database me save kar rahe hain
  const message = await Message.create({
    sender: senderId, // message bhejne wala user
    receiver: receiverId, // message receive karne wala user
    conversationId: conversation._id, // conversation ka reference
    content, // actual message text
    delivered: false // by default message delivered nahi mana jaata
  });

  // conversation ke last message details update kar rahe hain
  conversation.lastMessage = content;
  conversation.lastMessageAt = new Date();

  // receiver ke liye unread messages ka count badha rahe hain
  const currentUnread =
    conversation.unreadCount.get(receiverId) || 0;

  conversation.unreadCount.set(receiverId, currentUnread + 1);

  // updated conversation ko save kar rahe hain
  await conversation.save();

  return message;
};

// jab message delivery confirm ho jaye
export const markDelivered = async (
  messageId: string,
  conversationId: string,
  receiverId: string
) => {
  // message ko delivered mark kar rahe hain
  await Message.findByIdAndUpdate(messageId, {
    delivered: true
  });

  // conversation ko id ke basis par fetch kar rahe hain
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return;

  // receiver ke unread messages count ko reset kar rahe hain
  conversation.unreadCount.set(receiverId, 0);
  await conversation.save();
};
