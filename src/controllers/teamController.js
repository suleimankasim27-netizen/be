import { Team, Assignment, Evaluation, Evaluator } from "../models/index.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listTeams = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = { eventId: req.event._id };
  if (q) filter.name = { $regex: q, $options: "i" };
  const teams = await Team.find(filter).sort({ pitchNumber: 1, name: 1 }).lean();
  res.json({ teams });
});

export const createTeam = asyncHandler(async (req, res) => {
  const { name, description, members, logo, pitchNumber, website, notes } = req.body;
  const team = await Team.create({
    eventId: req.event._id,
    name: name.trim(),
    description: description || "",
    members: members || "",
    logo: logo || "",
    pitchNumber: pitchNumber === "" || pitchNumber === undefined ? undefined : Number(pitchNumber),
    website: website || "",
    notes: notes || "",
  });

  const evaluators = await Evaluator.find({ eventId: req.event._id }).select("_id").lean();
  if (evaluators.length) {
    await Assignment.insertMany(
      evaluators.map((evaluator) => ({
        eventId: req.event._id,
        evaluatorId: evaluator._id,
        teamId: team._id,
      })),
      { ordered: false }
    ).catch((err) => {
      if (err.code !== 11000) throw err;
    });
  }

  res.status(201).json({ team });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw errors.notFound("Team");
  if (String(team.eventId) !== String(req.event?._id) && req.event) {
    throw errors.forbidden();
  }
  const eventId = team.eventId;
  const { Event } = await import("../models/Event.js");
  const event = await Event.findById(eventId);
  if (!event || String(event.directorId) !== String(req.director._id)) throw errors.forbidden();

  const allowed = ["name", "description", "members", "logo", "pitchNumber", "website", "notes"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) team[key] = req.body[key];
  }
  await team.save();
  res.json({ team });
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw errors.notFound("Team");
  const { Event } = await import("../models/Event.js");
  const event = await Event.findById(team.eventId);
  if (!event || String(event.directorId) !== String(req.director._id)) throw errors.forbidden();

  await Promise.all([
    Assignment.deleteMany({ teamId: team._id }),
    Evaluation.deleteMany({ teamId: team._id }),
    Team.deleteOne({ _id: team._id }),
  ]);
  res.json({ success: true });
});
