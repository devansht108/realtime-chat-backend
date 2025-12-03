import mongoose from "mongoose";

// env me MONGO_URI hai ya nahi check karne ke liye
function getMongoUri(): string {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI missing in env");
  }
  return uri;
}

// database connect karne ka function
const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(getMongoUri());
    console.log(`MongoDB connected at ${conn.connection.host}`);
  } catch (err) {
    console.error("DB connection error", err);
    process.exit(1);
  }
};

export default connectDB;
