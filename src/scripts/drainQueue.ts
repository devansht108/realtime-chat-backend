import { Queue } from "bullmq";
import { bullmqRedis } from "../config/redis";

const drain = async () => {
  const queue = new Queue("analysis-queue", { connection: bullmqRedis });
  await queue.obliterate({ force: true }); // sab jobs delete karo
  console.log("Queue cleared!");
  process.exit(0);
};

drain();