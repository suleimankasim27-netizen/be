import { Router } from "express";
import {
  updateEvaluator,
  deleteEvaluator,
  sendLink,
  resendLink,
  revokeLink,
  regenerateLink,
} from "../controllers/evaluatorController.js";
import { requireDirector } from "../middleware/auth.js";

const router = Router();
router.use(requireDirector);

router.put("/:id", updateEvaluator);
router.delete("/:id", deleteEvaluator);
router.post("/:id/send-link", sendLink);
router.post("/:id/resend-link", resendLink);
router.post("/:id/revoke-link", revokeLink);
router.post("/:id/regenerate-link", regenerateLink);

export default router;
