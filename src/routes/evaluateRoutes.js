import { Router } from "express";
import {
  getEvaluateSession,
  getEvaluateTeams,
  getEvaluateTeam,
  submitEvaluation,
} from "../controllers/evaluateController.js";
import { requireEvaluatorToken } from "../middleware/evaluatorAuth.js";
import { evaluationRules } from "../validators/index.js";
import rateLimit from "express-rate-limit";

const router = Router();

const evaluateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly.", code: "RATE_LIMIT" },
});

router.use(evaluateLimiter);
router.use("/:token", requireEvaluatorToken);

router.get("/:token", getEvaluateSession);
router.get("/:token/teams", getEvaluateTeams);
router.get("/:token/teams/:teamId", getEvaluateTeam);
router.post("/:token/teams/:teamId", evaluationRules, submitEvaluation);

export default router;
