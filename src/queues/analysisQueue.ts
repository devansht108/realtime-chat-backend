import { Queue } from "bullmq";
import { bullmqRedis } from "../config/redis";

// analysis jobs ke liye dedicated queue
export const analysisQueue = new Queue("analysis-queue", {
  connection: bullmqRedis,
});

// helper function to enqueue an analysis job
export const addAnalysisJob = async (data: {
  conversationId: string;
  requestedByUserId: string;
}) => {
  await analysisQueue.add("analyze-conversation", data, {
    removeOnComplete: true,
    removeOnFail: false, // fail hone par record rakhna for debugging
    attempts: 3, // Gemini API timeout ke case me retry
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  });
};