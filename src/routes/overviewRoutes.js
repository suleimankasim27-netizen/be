import { Router } from "express";
import { listAllEvaluations } from "../controllers/resultsController.js";
import { dashboard } from "../controllers/eventController.js";
import { Team, Evaluator, Event } from "../models/index.js";
import { requireDirector } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.get("/dashboard", requireDirector, dashboard);

router.get(
  "/teams",
  requireDirector,
  asyncHandler(async (req, res) => {
    const events = await Event.find({ directorId: req.director._id }).select("_id name").lean();
    const ids = events.map((e) => e._id);
    const teams = await Team.find({ eventId: { $in: ids } }).sort({ createdAt: -1 }).lean();
    const eventMap = Object.fromEntries(events.map((e) => [String(e._id), e.name]));
    res.json({
      teams: teams.map((t) => ({ ...t, eventName: eventMap[String(t.eventId)] })),
    });
  })
);

router.get(
  "/evaluators",
  requireDirector,
  asyncHandler(async (req, res) => {
    const events = await Event.find({ directorId: req.director._id }).select("_id name").lean();
    const ids = events.map((e) => e._id);
    const evaluators = await Evaluator.find({ eventId: { $in: ids } }).sort({ createdAt: -1 }).lean();
    const eventMap = Object.fromEntries(events.map((e) => [String(e._id), e.name]));
    res.json({
      evaluators: evaluators.map((e) => ({
        _id: e._id,
        name: e.name,
        email: e.email,
        eventId: e.eventId,
        eventName: eventMap[String(e.eventId)],
        revoked: e.revoked,
        lastEmailSentAt: e.lastEmailSentAt,
        tokenExpiresAt: e.tokenExpiresAt,
      })),
    });
  })
);

router.get("/evaluations", requireDirector, listAllEvaluations);

export default router;
