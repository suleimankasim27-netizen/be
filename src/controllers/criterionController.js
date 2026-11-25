import { Criterion } from "../models/index.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function parseAllowedScores(input, maxPoints) {
  let scores = input;
  if (typeof input === "string") {
    scores = input
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  if (!Array.isArray(scores) || scores.length === 0) {
    throw errors.badRequest("Provide at least one allowed score.");
  }
  const unique = [...new Set(scores.map(Number))].sort((a, b) => a - b);
  if (unique.some((n) => n < 0 || n > maxPoints)) {
    throw errors.badRequest("Allowed scores must be between 0 and the maximum points.");
  }
  return unique;
}

export const listCriteria = asyncHandler(async (req, res) => {
  const criteria = await Criterion.find({ eventId: req.event._id }).sort({ order: 1 }).lean();
  res.json({ criteria });
});

export const createCriterion = asyncHandler(async (req, res) => {
  const { name, description, maxPoints, allowedScores, order, active } = req.body;
  const max = Number(maxPoints);
  const scores = parseAllowedScores(allowedScores, max);
  const count = await Criterion.countDocuments({ eventId: req.event._id });
  const criterion = await Criterion.create({
    eventId: req.event._id,
    name: name.trim(),
    description: description || "",
    maxPoints: max,
    allowedScores: scores,
    order: order ?? count + 1,
    active: active !== false,
  });
  res.status(201).json({ criterion });
});

export const updateCriterion = asyncHandler(async (req, res) => {
  const criterion = await Criterion.findById(req.params.id);
  if (!criterion) throw errors.notFound("Criterion");
  const { Event } = await import("../models/Event.js");
  const event = await Event.findById(criterion.eventId);
  if (!event || String(event.directorId) !== String(req.director._id)) throw errors.forbidden();

  if (req.body.name !== undefined) criterion.name = req.body.name.trim();
  if (req.body.description !== undefined) criterion.description = req.body.description;
  if (req.body.maxPoints !== undefined) criterion.maxPoints = Number(req.body.maxPoints);
  if (req.body.allowedScores !== undefined) {
    criterion.allowedScores = parseAllowedScores(req.body.allowedScores, criterion.maxPoints);
  }
  if (req.body.order !== undefined) criterion.order = req.body.order;
  if (req.body.active !== undefined) criterion.active = req.body.active;
  await criterion.save();
  res.json({ criterion });
});

export const deleteCriterion = asyncHandler(async (req, res) => {
  const criterion = await Criterion.findById(req.params.id);
  if (!criterion) throw errors.notFound("Criterion");
  const { Event } = await import("../models/Event.js");
  const event = await Event.findById(criterion.eventId);
  if (!event || String(event.directorId) !== String(req.director._id)) throw errors.forbidden();
  await Criterion.deleteOne({ _id: criterion._id });
  res.json({ success: true });
});
