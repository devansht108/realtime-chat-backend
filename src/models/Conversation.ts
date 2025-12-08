import mongoose, { Schema, Document, Model } from "mongoose";

// yeh interface conversation ka complete structure define karta hai
export interface IConversation {
  participants: mongoose.Types.ObjectId[]; // conversation me shamil users ke ObjectIds
  lastMessage?: string; // last message ka text
  lastMessageAt?: Date; // last message kab aaya tha
  unreadCount: Map<string, number>; // har user ke liye unread messages count
  createdAt?: Date; // timestamps se auto-generate hoga
  updatedAt?: Date; // timestamps se auto-generate hoga
}

// mongoose document ke sath interface extend kiya gaya hai
export interface IConversationDocument extends IConversation, Document {}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    // conversation ke sabhi participants ka list
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true }
    ],

    // conversation ka last message
    lastMessage: {
      type: String
    },

    // last message ka time store karte hain
    lastMessageAt: {
      type: Date
    },

    // userId ke according unread messages ka count store hota hai
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true } // createdAt aur updatedAt automatically handle honge
);

// yeh index user ke conversations ko jaldi find karne me help karega
ConversationSchema.index({ participants: 1 });

// yeh index latest message ke basis par conversations sort karne ke kaam aata hai
ConversationSchema.index({ lastMessageAt: -1 });

const Conversation: Model<IConversationDocument> =
  mongoose.model<IConversationDocument>("Conversation", ConversationSchema);

export default Conversation;
