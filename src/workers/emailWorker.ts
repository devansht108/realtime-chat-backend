import { Worker } from "bullmq";
import { bullmqRedis } from "../config/redis";

// fake email sending function jo 2 second wait karega
const mockSendEmail = async (email: string, content: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Sending email to ${email}: ${content}`);
      resolve(true);
    }, 2000);
  });
};

// worker setup jo queue ko monitor karega
export const emailWorker = new Worker(
  "email-queue", // ye naam same hona chahiye jo queue file me use kiya tha
  async (job) => {
    // jab bhi queue me koi job aayegi ye function chalega
    console.log(
      `Processing job ${job.id}: Sending email to user ${job.data.receiverId}`
    );

    // yahan hum email sending simulate kar rahe hain
    await mockSendEmail("user@example.com", job.data.messageContent);

    console.log(`Email sent successfully for job ${job.id}`);
  },
  {
    // BullMQ ke liye hamesha dedicated redis client use karna chahiye
    // shared redis client yahan allowed nahi hota
    connection: bullmqRedis,
    concurrency: 5 // ek saath 5 email bhejne ki limit
  }
);

// job complete hone par kya karna hai
emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

// job fail hone par error log karo
emailWorker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} failed: ${err?.message}`);
});
