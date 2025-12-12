import express from "express";
import { protect } from "../middleware/authMiddleware";
import { getUsersStatus } from "../controllers/userStatusController";

// express router create kar rahe hain
const router = express.Router();

// multiple users ka online status aur last seen fetch karne ka route
// protect middleware ensure karta hai ki only authenticated users access kar sakein
router.post("/status", protect, getUsersStatus);


export default router;
