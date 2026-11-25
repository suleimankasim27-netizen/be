import { Evaluator } from "../models/Evaluator.js";
import { Event } from "../models/Event.js";
import { hashToken } from "../utils/tokens.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export function isEventClosed(event) {
  if (!event) return true;
  if (event.status === "Completed" || event.status === "Archived") return true;
  if (event.settings?.evaluationOpen === false) return true;
  return false;
}

export const requireEvaluatorToken = asyncHandler(async (req, res, next) => {
  const token = req.params.token;
  if (!token) throw errors.invalidLink();

  const tokenHash = hashToken(token);
  const evaluator = await Evaluator.findOne({ tokenHash });
  if (!evaluator) throw errors.invalidLink();
  if (evaluator.revoked) throw errors.revokedLink();
  if (evaluator.tokenExpiresAt && evaluator.tokenExpiresAt < new Date()) {
    throw errors.expiredLink();
  }

  const event = await Event.findById(evaluator.eventId);
  if (!event) throw errors.invalidLink();

  req.evaluatorToken = token;
  req.evaluator = evaluator;
  req.event = event;
  next();
});
