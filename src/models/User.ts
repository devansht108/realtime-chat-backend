import mongoose, { Schema, Document, Model } from "mongoose";

// yeh interface user ke fields define karta hai (TypeScript ke liye)
export interface IUser {
  username: string;
  email: string;
  password: string;
  createdAt?: Date; // timestamps ke wajah se auto-generate hoga
  updatedAt?: Date; // timestamps ke wajah se auto-generate hoga
}

// yeh interface IUser ko mongoose Document ke sath extend karta hai
export interface IUserDocument extends IUser, Document {}

// user schema banaya ja raha hai jo database me structure define karega
const UserSchema = new Schema<IUserDocument>(
  {
    username: { type: String, required: true }, // username required hai
    email: { type: String, required: true, unique: true }, // email unique + required
    password: { type: String, required: true } // password required hai
  },
  { timestamps: true } // createdAt aur updatedAt auto-generate honge
);

// yeh mongoose model create kar raha hai jisse hum DB me CRUD operations kar sakte hain
const User: Model<IUserDocument> = mongoose.model<IUserDocument>("User", UserSchema);

export default User;
