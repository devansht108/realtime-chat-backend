import Conversation from "../models/Conversation";
import Message from "../models/Message";
import { getManyUsersStatus } from "./presenceService";

// ek user ke saare conversations fetch karne ka service function
export async function getUserConversations(userId: string) {
  // user jaha jaha participant hai un saari conversations ko fetch kar rahe hain
  const conversations = await Conversation.find({
    participants: userId
  })
    .populate("participants", "_id name avatar") // participants ka basic data fetch kar rahe hain
    .sort({ updatedAt: -1 }); // latest updated conversations sabse upar

  // har conversation ka ID collect kar rahe hain taaki last message aggregate kar sakein
  const convoIds = conversations.map(c => c._id);

  // har conversation ka last message nikalne ke liye aggregation pipeline use kar rahe hain
  const lastMessages = await Message.aggregate([
    // filter kar rahe hain ki sirf unhi messages ko consider karein jinka conversationId match karta hai
    { $match: { conversationId: { $in: convoIds } } },

    // latest messages sabse upar aane ke liye sort kar rahe hain
    { $sort: { createdAt: -1 } },

    // group karke har conversation ka sirf first (latest) message le rahe hain
    {
      $group: {
        _id: "$conversationId",
        message: { $first: "$$ROOT" }
      }
    }
  ]);

  // last messages ka map create kar rahe hain jisse fast lookup ho sake
  const mapLastMsg: any = {};
  for (const item of lastMessages) {
    mapLastMsg[item._id.toString()] = item.message;
  }

  // online status check karne ke liye other participants ke IDs collect kar rahe hain
  const otherUserIds: string[] = [];

  for (const convo of conversations) {
    for (const p of convo.participants) {
      // logged-in user ko skip kar rahe hain
      if (p._id.toString() !== userId) {
        otherUserIds.push(p._id.toString());
      }
    }
  }

  // Redis se saare users ka online/offline status ek hi request me fetch kar rahe hain
  const statuses = await getManyUsersStatus(otherUserIds);

  // online status ka map bana rahe hain taaki access easy ho
  const statusMap: any = {};
  for (const s of statuses) {
    statusMap[s.userId] = {
      online: s.online,
      lastSeen: s.lastSeen
    };
  }

  // final response structure banane ke liye mapping kar rahe hain
  const final = conversations.map(convo => {
    // conversation ke participants me se sirf dusra user nikal rahe hain
    const otherUsers = convo.participants.filter(
      (p: any) => p._id.toString() !== userId
    );

    // individual conversation me dusra user ka ID
    const theirId = otherUsers[0]?._id.toString();

    return {
      conversationId: convo._id, // conversation ka ID
      participants: otherUsers,  // dusre users ka data
      lastMessage: mapLastMsg[convo._id] || null, // last message agar mila ho
      online: statusMap[theirId]?.online || false, // online status
      lastSeen: statusMap[theirId]?.lastSeen || null // last seen timestamp
    };
  });

  return final;
}
