import { Router } from "express";
import {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  dashboard,
} from "../controllers/eventController.js";
import { listTeams, createTeam } from "../controllers/teamController.js";
import { listEvaluators, createEvaluator } from "../controllers/evaluatorController.js";
import { listCriteria, createCriterion } from "../controllers/criterionController.js";
import {
  listAssignments,
  createAssignments,
  replaceEvaluatorAssignments,
} from "../controllers/assignmentController.js";
import {
  getResults,
  getRankingsHandler,
  getTeamResultsHandler,
  exportResults,
} from "../controllers/resultsController.js";
import { requireDirector } from "../middleware/auth.js";
import { requireEventOwner } from "../middleware/eventOwner.js";
import { eventRules, teamRules, evaluatorRules, criterionRules } from "../validators/index.js";

const router = Router();

router.use(requireDirector);

router.get("/dashboard", dashboard);
router.get("/", listEvents);
router.post("/", eventRules, createEvent);

router.get("/:eventId/teams", requireEventOwner, listTeams);
router.post("/:eventId/teams", requireEventOwner, teamRules, createTeam);

router.get("/:eventId/evaluators", requireEventOwner, listEvaluators);
router.post("/:eventId/evaluators", requireEventOwner, evaluatorRules, createEvaluator);

router.get("/:eventId/criteria", requireEventOwner, listCriteria);
router.post("/:eventId/criteria", requireEventOwner, criterionRules, createCriterion);

router.get("/:eventId/assignments", requireEventOwner, listAssignments);
router.post("/:eventId/assignments", requireEventOwner, createAssignments);
router.put(
  "/:eventId/evaluators/:evaluatorId/assignments",
  requireEventOwner,
  replaceEvaluatorAssignments
);

router.get("/:eventId/results", requireEventOwner, getResults);
router.get("/:eventId/rankings", requireEventOwner, getRankingsHandler);
router.get("/:eventId/teams/:teamId/results", requireEventOwner, getTeamResultsHandler);
router.get("/:eventId/export", requireEventOwner, exportResults);

router.get("/:id", requireEventOwner, getEvent);
router.put("/:id", requireEventOwner, eventRules, updateEvent);
router.delete("/:id", requireEventOwner, deleteEvent);

export default router;
