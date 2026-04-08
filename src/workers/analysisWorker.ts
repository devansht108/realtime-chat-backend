import { Worker } from "bullmq";
import { bullmqRedis } from "../config/redis";
import { getIO } from "../config/io";
import Message from "../models/Message";

// Gemini API response ka structure
interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
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

// Gemini API call karna
const callGemini = async (transcript: string): Promise<AnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing in environment variables");
  }

  const prompt = `You are a conversation quality analyzer, similar to how a sales coach analyzes sales calls.

Analyze this chat conversation and return ONLY a JSON object with no markdown, no explanation:
{
  "score": <number 1-10, overall communication quality>,
  "keyMoments": [<string>, <string>],
  "coachingTip": <string, one specific actionable tip for the sender>
}

Conversation:
${transcript}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // markdown fences strip karo agar Gemini ne wrap kiya ho
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  const parsed: AnalysisResult = JSON.parse(cleaned);
  return parsed;
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
      .sort({ createdAt: 1 })
      .select("sender content createdAt")
      .lean();

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

    // Step 3: Gemini API call karo
    const analysis = await callGemini(transcript);

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