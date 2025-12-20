import { Request, Response } from "express";
import { addEmailJob } from "../queues/emailQueue";

export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { email, content } = req.body;

    if (!email || !content) {
      return res.status(400).json({ error: "Email and content are required" });
    }

    // helper function use karke job queue me add kar rahe hain
    await addEmailJob({
      receiverId: email,
      senderId: "system-admin", 
      messageContent: content,
    });

    return res.status(200).json({ 
      success: true, 
      message: "Email queued successfully!" 
    });

  } catch (error) {
    console.error("Error queueing email:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};