import express from "express";
import { protect } from "../middleware/authMiddleware";
import { getUsersStatus } from "../controllers/userStatusController";
import { redis } from "../config/redis"; // redis use karenge online check ke liye

// express router create kar rahe hain
const router = express.Router();


// MULTIPLE USERS STATUS 
// multiple users ka online status aur last seen fetch karne ka route
// protect middleware ensure karta hai ki only authenticated users access kar sakein
router.post("/status", protect, getUsersStatus);



// SINGLE USER ONLINE CHECK 
// ye route frontend ko batayega ki koi specific user abhi online hai ya nahi
// socket event ka wait karne ki jagah page load pe hi presence mil jayegi
router.get("/:id/online", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // redis me check kar rahe hain ki user online key exist karti hai ya nahi
    const isOnline = await redis.get(`user:${id}:online`);

    // agar value mil gayi to user online hai
    res.json({ online: !!isOnline });
  } catch (error) {
    console.error("Error checking user online status:", error);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
