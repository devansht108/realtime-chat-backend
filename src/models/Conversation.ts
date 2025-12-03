import mongoose, { Schema, Document, Model } from "mongoose";

// yeh interface conversation ke main fields define karta hai
export interface IConversation {
  participants: mongoose.Types.ObjectId[]; // conversation me kaun-kaun users hain
  lastMessage?: string; // last message store karne ke liye (optional)
  createdAt?: Date; // timestamps se auto-set hoga
  updatedAt?: Date; // timestamps se auto-set hoga
}

// mongoose document ko extend karta hai taaki DB related properties mil sakein
export interface IConversationDocument extends IConversation, Document {}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    // yeh array me users ke ObjectId store karega, aur ref "User" se relation banata hai
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],

    // last message ko store karne ke liye simple string field
    lastMessage: { type: String }
  },
  { timestamps: true } // yeh createdAt aur updatedAt ko auto-manage karega
);

// yeh mongoose model banata hai jisse hum conversation collection me CRUD kar sakte hain
const Conversation: Model<IConversationDocument> =
  mongoose.model<IConversationDocument>("Conversation", ConversationSchema);

export default Conversation;
