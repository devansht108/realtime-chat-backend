import mongoose, { Schema, Document, Model } from "mongoose";

// yeh interface message ke fields define karta hai
export interface IMessage {
  sender: mongoose.Types.ObjectId; // jis user ne message bheja
  receiver: mongoose.Types.ObjectId; // jis user ko message mila
  conversationId: mongoose.Types.ObjectId; // message kis conversation ka part hai
  content: string; // actual message text

  // message ka current status
  // sent -> delivered -> read
  status: "sent" | "delivered" | "read";

  deliveredAt?: Date; // kab message deliver hua
  readAt?: Date; // kab message read hua

  createdAt?: Date;
  updatedAt?: Date;
}

// mongoose document ke sath extend kiya gaya interface
export interface IMessageDocument extends IMessage, Document {}

const MessageSchema = new Schema<IMessageDocument>(
  {
    // sender ka user id
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // receiver ka user id
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // message kis conversation ka hissa hai
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },

    // actual text message
    content: {
      type: String,
      required: true
    },

    // message lifecycle status
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    },

    // delivery ka time
    deliveredAt: {
      type: Date
    },

    // read ka time
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true // createdAt aur updatedAt auto manage honge
  }
);

// mongoose model
const Message: Model<IMessageDocument> = mongoose.model<IMessageDocument>(
  "Message",
  MessageSchema
);

export default Message;
