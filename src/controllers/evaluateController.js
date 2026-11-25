import { Assignment, Evaluation, Team, Criterion } from "../models/index.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isEventClosed } from "../middleware/evaluatorAuth.js";
import { recalculateTotal } from "../services/scoringService.js";

function evaluatorSafeEvent(event) {
  return {
    _id: event._id,
    name: event.name,
    description: event.description,
    date: event.date,
    location: event.location,
    status: event.status,
    evaluationStartDate: event.evaluationStartDate,
    evaluationEndDate: event.evaluationEndDate,
    closed: isEventClosed(event),
    settings: {
      allowEvaluatorEdits: Boolean(event.settings?.allowEvaluatorEdits),
      requireFeedback: Boolean(event.settings?.requireFeedback),
    },
  };
}

export const getEvaluateSession = asyncHandler(async (req, res) => {
  const { evaluator, event } = req;
  const [assignments, evaluations, teams] = await Promise.all([
    Assignment.find({ eventId: event._id, evaluatorId: evaluator._id }).lean(),
    Evaluation.find({ eventId: event._id, evaluatorId: evaluator._id }).lean(),
    Team.find({ eventId: event._id }).lean(),
  ]);

  const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t]));
  const evalMap = Object.fromEntries(evaluations.map((e) => [String(e.teamId), e]));

  const assignedTeams = assignments
    .map((a) => {
      const team = teamMap[String(a.teamId)];
      if (!team) return null;
      const evaluation = evalMap[String(a.teamId)];
      return {
        _id: team._id,
        name: team.name,
        description: team.description,
        members: team.members,
        logo: team.logo,
        pitchNumber: team.pitchNumber,
        website: team.website,
        status: evaluation?.complete ? "Completed" : evaluation ? "In progress" : "Pending",
        totalScore: evaluation?.totalScore ?? null,
        complete: Boolean(evaluation?.complete),
        submittedAt: evaluation?.submittedAt ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.pitchNumber || 9999) - (b.pitchNumber || 9999) || a.name.localeCompare(b.name));

  const completed = assignedTeams.filter((t) => t.status === "Completed").length;
  const maxTotal = (await Criterion.find({ eventId: event._id, active: true }).lean()).reduce(
    (s, c) => s + c.maxPoints,
    0
  );

  res.json({
    event: evaluatorSafeEvent(event),
    evaluator: { name: evaluator.name },
    teams: assignedTeams,
    progress: { completed, total: assignedTeams.length },
    maxTotal,
  });
});

export const getEvaluateTeams = asyncHandler(async (req, res) => {
  return getEvaluateSession(req, res);
});

export const getEvaluateTeam = asyncHandler(async (req, res) => {
  const { evaluator, event } = req;
  const { teamId } = req.params;

  const assignment = await Assignment.findOne({
    eventId: event._id,
    evaluatorId: evaluator._id,
    teamId,
  });
  if (!assignment) throw errors.notAssigned();

  const [team, criteria, evaluation] = await Promise.all([
    Team.findOne({ _id: teamId, eventId: event._id }).lean(),
    Criterion.find({ eventId: event._id, active: true }).sort({ order: 1 }).lean(),
    Evaluation.findOne({ eventId: event._id, evaluatorId: evaluator._id, teamId }).lean(),
  ]);
  if (!team) throw errors.notFound("Team");

  res.json({
    event: evaluatorSafeEvent(event),
    evaluator: { name: evaluator.name },
    team,
    criteria: criteria.map((c) => ({
      _id: c._id,
      name: c.name,
      description: c.description,
      maxPoints: c.maxPoints,
      allowedScores: c.allowedScores,
      order: c.order,
    })),
    evaluation: evaluation
      ? {
          scores: evaluation.scores,
          totalScore: evaluation.totalScore,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          submittedAt: evaluation.submittedAt,
          complete: Boolean(evaluation.complete),
        }
      : null,
    maxTotal: criteria.reduce((s, c) => s + c.maxPoints, 0),
  });
});

export const submitEvaluation = asyncHandler(async (req, res) => {
  const { evaluator, event } = req;
  const { teamId } = req.params;
  const { scores, strengths, improvements } = req.body;

  if (isEventClosed(event)) throw errors.eventClosed();

  const assignment = await Assignment.findOne({
    eventId: event._id,
    evaluatorId: evaluator._id,
    teamId,
  });
  if (!assignment) throw errors.notAssigned();

  const existing = await Evaluation.findOne({
    eventId: event._id,
    evaluatorId: evaluator._id,
    teamId,
  });

  if (existing?.complete && !event.settings?.allowEvaluatorEdits) {
    throw errors.alreadySubmitted();
  }

  const criteria = await Criterion.find({ eventId: event._id, active: true }).sort({ order: 1 });
  const incoming = Array.isArray(scores) ? scores : [];
  const byId = Object.fromEntries(incoming.map((s) => [String(s.criterionId), s]));
  const kept = Object.fromEntries((existing?.scores || []).map((s) => [String(s.criterionId), s]));
  const normalized = [];

  for (const criterion of criteria) {
    const entry = byId[String(criterion._id)];
    if (!entry || entry.score === undefined || entry.score === null || entry.score === "") {
      const previous = kept[String(criterion._id)];
      if (previous) {
        normalized.push({
          criterionId: criterion._id,
          name: criterion.name,
          score: previous.score,
          maxPoints: criterion.maxPoints,
        });
      }
      continue;
    }
    const score = Number(entry.score);
    if (!criterion.allowedScores.includes(score)) {
      throw errors.badRequest(`The score for “${criterion.name}” is not an allowed value.`);
    }
    normalized.push({
      criterionId: criterion._id,
      name: criterion.name,
      score,
      maxPoints: criterion.maxPoints,
    });
  }

  if (!normalized.length) {
    throw errors.badRequest("Select a score to save.");
  }

  const complete = normalized.length === criteria.length;
  const totalScore = recalculateTotal(normalized);
  const payload = {
    eventId: event._id,
    evaluatorId: evaluator._id,
    teamId,
    scores: normalized,
    totalScore,
    strengths: strengths !== undefined ? strengths || "" : existing?.strengths || "",
    improvements: improvements !== undefined ? improvements || "" : existing?.improvements || "",
    complete,
    submittedAt: new Date(),
  };

  let evaluation;
  if (existing) {
    Object.assign(existing, payload);
    evaluation = await existing.save();
  } else {
    try {
      evaluation = await Evaluation.create(payload);
    } catch (err) {
      if (err.code === 11000) throw errors.alreadySubmitted();
      throw err;
    }
  }

  res.status(existing ? 200 : 201).json({
    evaluation: {
      _id: evaluation._id,
      scores: evaluation.scores,
      totalScore: evaluation.totalScore,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      submittedAt: evaluation.submittedAt,
      complete: Boolean(evaluation.complete),
    },
  });
});
