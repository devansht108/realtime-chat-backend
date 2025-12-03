import mongoose, { Schema, Document, Model } from "mongoose";

// yeh interface message ke fields define karta hai
export interface IMessage {
  sender: mongoose.Types.ObjectId; // jis user ne message bheja
  receiver: mongoose.Types.ObjectId; // jis user ko message mila
  conversationId: mongoose.Types.ObjectId; // message kis conversation ka part hai
  content: string; // actual message text
  delivered: boolean; // message deliver hua ya nahi
  createdAt?: Date; // timestamps automatically set honge
  updatedAt?: Date; // timestamps automatically set honge
}

// mongoose document ke sath extend kiya gaya interface
export interface IMessageDocument extends IMessage, Document {}

const MessageSchema = new Schema<IMessageDocument>(
  {
    // sender ka user id
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // receiver ka user id
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // yeh batata hai message kis conversation se belong karta hai
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },

    // message content
    content: { type: String, required: true },

    // delivered status, default false rakha hai
    delivered: { type: Boolean, default: false }
  },
  { timestamps: true } // auto-createdAt aur updatedAt fields
);

// mongoose model banaya ja raha hai jisse hum messages collection par CRUD kar sakte hain
const Message: Model<IMessageDocument> =
  mongoose.model<IMessageDocument>("Message", MessageSchema);

export default Message;
