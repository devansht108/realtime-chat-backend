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
    removeOnFail: false,
    attempts: 1, // no retries — quota errors loop prevent karne ke liye
  });
};
