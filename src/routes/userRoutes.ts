import express, { RequestHandler } from "express";
import { getLastSeen } from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

// express router create kar rahe hain
const router = express.Router();

// specific user ka last seen aur online status fetch karne ka route
// protect middleware ko RequestHandler type me cast kar rahe hain
// taaki TypeScript type mismatch error resolve ho
router.get(
  "/:userId/last-seen",
  protect as unknown as RequestHandler,
  getLastSeen as unknown as RequestHandler
);

// router ko export kar rahe hain taaki app me use ho sake
export default router;
