import { Worker } from "bullmq";
import { bullmqRedis } from "../config/redis";
import { getIO } from "../config/io";
import Message from "../models/Message";

// Groq API response ka structure
interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// LLM se jo structured output aayega
interface AnalysisResult {
  score: number;
  keyMoments: string[];
  coachingTip: string;
}

// conversation messages ko transcript string me convert karna
const buildTranscript = (
  messages: { sender: string; content: string; createdAt?: Date }[]
): string => {
  return messages
    .map((msg) => {
      const time = msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString()
        : "";
      return `[${time}] User ${msg.sender}: ${msg.content}`;
    })
    .join("\n");
};

// Groq API call karna
const callGroq = async (transcript: string): Promise<AnalysisResult> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `You are a conversation quality analyzer, similar to how a sales coach analyzes sales calls.

Analyze this chat conversation and return ONLY a JSON object with no markdown, no explanation:
{
  "score": <number 1-10, overall communication quality>,
  "keyMoments": [<string>, <string>],
  "coachingTip": <string, one specific actionable tip for the sender>
}

Conversation:
${transcript}`
        }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as GroqResponse;
  const rawText = data.choices?.[0]?.message?.content ?? "";
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as AnalysisResult;
};

// worker definition — emailWorker ke same pattern ko follow karta hai
export const analysisWorker = new Worker(
  "analysis-queue",
  async (job) => {
    const { conversationId, requestedByUserId } = job.data as {
      conversationId: string;
      requestedByUserId: string;
    };

    console.log(
      `[AnalysisWorker] Processing job ${job.id} for conversation ${conversationId}`
    );

    // Step 1: MongoDB se conversation ke messages fetch karo
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 }) // latest pehle
      .limit(20) // sirf last 20 messages
      .select("sender content createdAt")
      .lean();

      messages.reverse(); // chronological order restore karo
      
    if (!messages || messages.length === 0) {
      throw new Error(`No messages found for conversation ${conversationId}`);
    }

    // Step 2: Messages ko transcript string me convert karo
    const transcript = buildTranscript(
      messages.map((m) => ({
        sender: m.sender.toString(),
        content: m.content,
        createdAt: m.createdAt,
      }))
    );

    // Step 3: Groq API call karo
    const analysis = await callGroq(transcript);

    console.log(
      `[AnalysisWorker] Analysis complete for job ${job.id}:`,
      analysis
    );

    // Step 4: Result ko Socket.IO ke through user ko emit karo
    try {
      const io = getIO();
      io.to(requestedByUserId).emit("conversation_analysis", {
        conversationId,
        analysis,
        analyzedAt: new Date().toISOString(),
      });
      console.log(
        `[AnalysisWorker] Emitted result to user ${requestedByUserId}`
      );
    } catch (socketError) {
      console.warn(
        `[AnalysisWorker] Socket emit failed (user may be offline):`,
        socketError
      );
    }

    return analysis;
  },
  {
    connection: bullmqRedis,
    concurrency: 3,
  }
);

// job lifecycle events
analysisWorker.on("completed", (job) => {
  console.log(`[AnalysisWorker] Job ${job.id} completed successfully`);
});

analysisWorker.on("failed", (job, err) => {
  console.error(`[AnalysisWorker] Job ${job?.id} failed:`, err?.message);
});