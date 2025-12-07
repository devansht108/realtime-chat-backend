import Message from "../models/Message";
import Conversation from "../models/Conversation";

// message ko database me save karne ka function
export const saveMessage = async (
  senderId: string,
  receiverId: string,
  content: string
) => {
  // pehle check kar rahe hain ki sender aur receiver ke beech conversation hai ya nahi
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] }
  });

  // agar conversation exist nahi karti toh nayi conversation create kar rahe hain
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId]
    });
  }

  // naya message create kar rahe hain
  const message = await Message.create({
    sender: senderId, // message bhejne wala user
    receiver: receiverId, // message receive karne wala user
    conversationId: conversation._id, // kis conversation ka message hai
    content, // message ka text
    delivered: false // by default delivered false rakha hai
  });

  // conversation me lastMessage ko update kar rahe hain
  conversation.lastMessage = content;
  await conversation.save();

  return message;
};

// message ko delivered mark karne ka function
export const markDelivered = async (messageId: string) => {
  // message id ke basis par delivered true set kar rahe hain
  await Message.findByIdAndUpdate(messageId, {
    delivered: true
  });
};
