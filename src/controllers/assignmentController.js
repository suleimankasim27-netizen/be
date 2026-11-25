import { Assignment, Evaluator, Team } from "../models/index.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listAssignments = asyncHandler(async (req, res) => {
  const assignments = await Assignment.find({ eventId: req.event._id }).lean();
  res.json({ assignments });
});

export const createAssignments = asyncHandler(async (req, res) => {
  const { evaluatorId, teamIds, assignAll } = req.body;
  const evaluator = await Evaluator.findOne({ _id: evaluatorId, eventId: req.event._id });
  if (!evaluator) throw errors.notFound("Evaluator");

  let teams;
  if (assignAll) {
    teams = await Team.find({ eventId: req.event._id }).select("_id").lean();
  } else {
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw errors.badRequest("Select at least one team, or assign all teams.");
    }
    teams = await Team.find({ _id: { $in: teamIds }, eventId: req.event._id }).select("_id").lean();
  }

  const docs = teams.map((team) => ({
    eventId: req.event._id,
    evaluatorId: evaluator._id,
    teamId: team._id,
  }));

  if (docs.length) {
    await Assignment.insertMany(docs, { ordered: false }).catch((err) => {
      if (err.code !== 11000) throw err;
    });
  }

  const assignments = await Assignment.find({ eventId: req.event._id, evaluatorId: evaluator._id }).lean();
  res.status(201).json({ assignments });
});

export const replaceEvaluatorAssignments = asyncHandler(async (req, res) => {
  const { teamIds, assignAll } = req.body;
  const evaluator = await Evaluator.findOne({ _id: req.params.evaluatorId, eventId: req.event._id });
  if (!evaluator) throw errors.notFound("Evaluator");

  let teams;
  if (assignAll) {
    teams = await Team.find({ eventId: req.event._id }).select("_id").lean();
  } else {
    teams = await Team.find({
      _id: { $in: teamIds || [] },
      eventId: req.event._id,
    })
      .select("_id")
      .lean();
  }

  await Assignment.deleteMany({ eventId: req.event._id, evaluatorId: evaluator._id });
  const docs = teams.map((team) => ({
    eventId: req.event._id,
    evaluatorId: evaluator._id,
    teamId: team._id,
  }));
  if (docs.length) await Assignment.insertMany(docs);

  const assignments = await Assignment.find({ eventId: req.event._id, evaluatorId: evaluator._id }).lean();
  res.json({ assignments });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw errors.notFound("Assignment");
  const { Event } = await import("../models/Event.js");
  const event = await Event.findById(assignment.eventId);
  if (!event || String(event.directorId) !== String(req.director._id)) throw errors.forbidden();
  await Assignment.deleteOne({ _id: assignment._id });
  res.json({ success: true });
});
