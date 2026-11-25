import { Event, Team, Evaluator, Evaluation, Assignment, Criterion } from "../models/index.js";
import { DEFAULT_STARTUP_PITCH_CRITERIA } from "../constants/defaultCriteria.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getEventProgress } from "../services/scoringService.js";

export const listEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ directorId: req.director._id }).sort({ createdAt: -1 }).lean();
  const ids = events.map((e) => e._id);

  const [teams, evaluators, evaluations, assignments] = await Promise.all([
    Team.aggregate([{ $match: { eventId: { $in: ids } } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    Evaluator.aggregate([{ $match: { eventId: { $in: ids } } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    Evaluation.aggregate([
      { $match: { eventId: { $in: ids }, complete: { $ne: false } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]),
    Assignment.aggregate([{ $match: { eventId: { $in: ids } } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
  ]);

  const toMap = (arr) => Object.fromEntries(arr.map((x) => [String(x._id), x.count]));
  const teamMap = toMap(teams);
  const evalMap = toMap(evaluators);
  const doneMap = toMap(evaluations);
  const assignMap = toMap(assignments);

  res.json({
    events: events.map((event) => ({
      ...event,
      teamCount: teamMap[String(event._id)] || 0,
      evaluatorCount: evalMap[String(event._id)] || 0,
      completedEvaluations: doneMap[String(event._id)] || 0,
      expectedEvaluations: assignMap[String(event._id)] || 0,
    })),
  });
});

export const createEvent = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    date,
    location,
    status,
    evaluationStartDate,
    evaluationEndDate,
    useDefaultCriteria,
    settings,
  } = req.body;

  const event = await Event.create({
    name: name.trim(),
    description: description || "",
    date: date || undefined,
    location: location || "",
    status: status || "Draft",
    evaluationStartDate: evaluationStartDate || undefined,
    evaluationEndDate: evaluationEndDate || undefined,
    directorId: req.director._id,
    settings: {
      evaluationOpen: true,
      allowEvaluatorEdits: true,
      includeIncompleteInRankings: true,
      requireFeedback: false,
      ...(settings || {}),
    },
  });

  if (useDefaultCriteria !== false) {
    await Criterion.insertMany(
      DEFAULT_STARTUP_PITCH_CRITERIA.map((c) => ({ ...c, eventId: event._id }))
    );
  }

  res.status(201).json({ event });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = req.event;
  const [teamCount, evaluatorCount, assignmentCount, evaluationCount, criteria, progress] =
    await Promise.all([
      Team.countDocuments({ eventId: event._id }),
      Evaluator.countDocuments({ eventId: event._id }),
      Assignment.countDocuments({ eventId: event._id }),
      Evaluation.countDocuments({ eventId: event._id, complete: { $ne: false } }),
      Criterion.find({ eventId: event._id }).sort({ order: 1 }).lean(),
      getEventProgress(event._id),
    ]);

  res.json({
    event,
    stats: {
      teamCount,
      evaluatorCount,
      expectedEvaluations: assignmentCount,
      completedEvaluations: evaluationCount,
      pendingEvaluations: Math.max(assignmentCount - evaluationCount, 0),
    },
    criteria,
    progress,
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const allowed = [
    "name",
    "description",
    "date",
    "location",
    "status",
    "evaluationStartDate",
    "evaluationEndDate",
    "settings",
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const value = req.body[key];
      req.event[key] =
        (key === "date" || key === "evaluationStartDate" || key === "evaluationEndDate") && value === ""
          ? undefined
          : value;
    }
  }
  await req.event.save();
  res.json({ event: req.event });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const eventId = req.event._id;
  await Promise.all([
    Team.deleteMany({ eventId }),
    Evaluator.deleteMany({ eventId }),
    Criterion.deleteMany({ eventId }),
    Assignment.deleteMany({ eventId }),
    Evaluation.deleteMany({ eventId }),
    Event.deleteOne({ _id: eventId }),
  ]);
  res.json({ success: true });
});

export const dashboard = asyncHandler(async (req, res) => {
  const events = await Event.find({ directorId: req.director._id }).sort({ createdAt: -1 }).lean();
  const ids = events.map((e) => e._id);

  const [teamCount, evaluatorCount, evaluationCount, assignmentCount] = await Promise.all([
    Team.countDocuments({ eventId: { $in: ids } }),
    Evaluator.countDocuments({ eventId: { $in: ids } }),
    Evaluation.countDocuments({ eventId: { $in: ids }, complete: { $ne: false } }),
    Assignment.countDocuments({ eventId: { $in: ids } }),
  ]);

  const recent = events.slice(0, 6);
  const recentIds = recent.map((e) => e._id);
  const [teams, evaluators, evaluations, assignments] = await Promise.all([
    Team.aggregate([
      { $match: { eventId: { $in: recentIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]),
    Evaluator.aggregate([
      { $match: { eventId: { $in: recentIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]),
    Evaluation.aggregate([
      { $match: { eventId: { $in: recentIds }, complete: { $ne: false } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]),
    Assignment.aggregate([
      { $match: { eventId: { $in: recentIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]),
  ]);
  const toMap = (arr) => Object.fromEntries(arr.map((x) => [String(x._id), x.count]));
  const tMap = toMap(teams);
  const jMap = toMap(evaluators);
  const dMap = toMap(evaluations);
  const aMap = toMap(assignments);

  res.json({
    stats: {
      totalEvents: events.length,
      activeEvents: events.filter((e) => e.status === "Active").length,
      totalJudges: evaluatorCount,
      totalTeams: teamCount,
      completedEvaluations: evaluationCount,
      pendingEvaluations: Math.max(assignmentCount - evaluationCount, 0),
    },
    recentEvents: recent.map((event) => ({
      ...event,
      teamCount: tMap[String(event._id)] || 0,
      evaluatorCount: jMap[String(event._id)] || 0,
      completedEvaluations: dMap[String(event._id)] || 0,
      expectedEvaluations: aMap[String(event._id)] || 0,
    })),
  });
});
