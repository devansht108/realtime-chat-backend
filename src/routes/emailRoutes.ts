import { Router } from "express";
import { sendEmail } from "../controllers/emailController";

const router = Router();

// POST /api/email/send
router.post("/send", sendEmail);

export default router;