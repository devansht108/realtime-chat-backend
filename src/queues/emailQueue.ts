import { Queue } from "bullmq";
import { bullmqRedis } from "../config/redis";

// humari queue ka naam email-queue hai
// isme hum wo jobs daalenge jo background me process karni hain
export const emailQueue = new Queue("email-queue", {
  // BullMQ ke liye dedicated redis client use karna mandatory hota hai
  // shared redis client yahan crash kar deta hai
  connection: bullmqRedis,
});

// helper function job add karne ke liye
export const addEmailJob = async (data: {
  receiverId: string;
  senderId: string;
  messageContent: string;
}) => {
  // job ko queue me add kar rahe hain
  // removeOnComplete true ka matlab hai jab kaam ho jaye to redis se delete kar do
  await emailQueue.add("send-email", data, {
    removeOnComplete: true,
    removeOnFail: false, // agar fail ho jaye to record rakhna taaki debug kar sakein
  });
};
