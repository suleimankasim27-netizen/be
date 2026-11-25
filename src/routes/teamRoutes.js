import { Router } from "express";
import { updateTeam, deleteTeam } from "../controllers/teamController.js";
import { requireDirector } from "../middleware/auth.js";

const router = Router();
router.use(requireDirector);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);

export default router;
