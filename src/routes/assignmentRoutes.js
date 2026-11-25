import { Router } from "express";
import { deleteAssignment } from "../controllers/assignmentController.js";
import { requireDirector } from "../middleware/auth.js";

const router = Router();
router.use(requireDirector);
router.delete("/:id", deleteAssignment);

export default router;
