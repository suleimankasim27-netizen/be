import { Router } from "express";
import { updateCriterion, deleteCriterion } from "../controllers/criterionController.js";
import { requireDirector } from "../middleware/auth.js";

const router = Router();
router.use(requireDirector);
router.put("/:id", updateCriterion);
router.delete("/:id", deleteCriterion);

export default router;
