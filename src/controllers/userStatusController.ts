import { Request, Response } from "express";
import { getManyUsersStatus } from "../services/presenceService";

// multiple users ka online status aur last seen fetch karne ka controller
export const getUsersStatus = async (req: Request, res: Response) => {
  try {
    // request body se user ids ka array le rahe hain
    const { ids } = req.body;

    // validate kar rahe hain ki ids array hona chahiye
    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: "ids must be an array"
      });
    }

    // presenceService se multiple users ka status fetch kar rahe hain
    const statuses = await getManyUsersStatus(ids);

    // response me statuses return kar rahe hain
    return res.json({
      success: true,
      users: statuses
    });
  } catch (err) {
    // agar koi unexpected error aaye toh log kar rahe hain
    console.error("getUsersStatus error", err);

    // generic error response bhej rahe hain
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
