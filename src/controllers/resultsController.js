import { Evaluation, Event, Team, Evaluator } from "../models/index.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getRankings, getTeamResults, getEventProgress } from "../services/scoringService.js";
import { toCsv } from "../utils/csv.js";

export const getResults = asyncHandler(async (req, res) => {
  const [rankings, progress, evaluations] = await Promise.all([
    getRankings(req.event),
    getEventProgress(req.event._id),
    Evaluation.find({ eventId: req.event._id }).sort({ submittedAt: -1 }).lean(),
  ]);

  const [teams, evaluators] = await Promise.all([
    Team.find({ eventId: req.event._id }).lean(),
    Evaluator.find({ eventId: req.event._id }).select("name email").lean(),
  ]);
  const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t]));
  const evMap = Object.fromEntries(evaluators.map((e) => [String(e._id), e]));

  res.json({
    ...rankings,
    progress,
    evaluations: evaluations.map((e) => ({
      _id: e._id,
      teamId: e.teamId,
      teamName: teamMap[String(e.teamId)]?.name,
      evaluatorId: e.evaluatorId,
      evaluatorName: evMap[String(e.evaluatorId)]?.name,
      totalScore: e.totalScore,
      submittedAt: e.submittedAt,
      strengths: e.strengths,
      improvements: e.improvements,
    })),
  });
});

export const getRankingsHandler = asyncHandler(async (req, res) => {
  const includeIncomplete =
    req.query.includeIncomplete === "true"
      ? true
      : req.query.includeIncomplete === "false"
        ? false
        : undefined;
  const data = await getRankings(req.event, { includeIncomplete });
  res.json(data);
});

export const getTeamResultsHandler = asyncHandler(async (req, res) => {
  const data = await getTeamResults(req.event, req.params.teamId);
  if (!data) throw errors.notFound("Team");
  res.json(data);
});

export const exportResults = asyncHandler(async (req, res) => {
  const detailed = req.query.detailed === "true";
  const data = await getRankings(req.event, { includeIncomplete: true });
  const fileBase = `${req.event.name.replace(/[^\w]+/g, "-").toLowerCase()}-results`;

  if (!detailed) {
    const headers = [
      "Rank",
      "Team",
      "Evaluator Count",
      "Average Score",
      ...data.criteria.map((c) => `${c.name} Average`),
      "Completion",
    ];
    const rows = data.rankings.map((r) => {
      const row = {
        Rank: r.rank,
        Team: r.name,
        "Evaluator Count": r.completedEvaluations,
        "Average Score": r.averageScore,
        Completion: r.complete ? "Complete" : "Incomplete",
      };
      for (const c of r.criterionAverages) {
        row[`${c.name} Average`] = c.average;
      }
      return row;
    });
    const csv = toCsv(headers, rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.csv"`);
    return res.send(csv);
  }

  const evaluations = await Evaluation.find({ eventId: req.event._id }).lean();
  const [teams, evaluators] = await Promise.all([
    Team.find({ eventId: req.event._id }).lean(),
    Evaluator.find({ eventId: req.event._id }).select("name email").lean(),
  ]);
  const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t]));
  const evMap = Object.fromEntries(evaluators.map((e) => [String(e._id), e]));

  const criterionNames = data.criteria.map((c) => c.name);
  const headers = [
    "Team",
    "Evaluator",
    "Total Score",
    ...criterionNames,
    "Strengths",
    "Areas for Improvement",
    "Submitted At",
  ];
  const rows = evaluations.map((e) => {
    const row = {
      Team: teamMap[String(e.teamId)]?.name || "",
      Evaluator: evMap[String(e.evaluatorId)]?.name || "",
      "Total Score": e.totalScore,
      Strengths: e.strengths,
      "Areas for Improvement": e.improvements,
      "Submitted At": e.submittedAt ? new Date(e.submittedAt).toISOString() : "",
    };
    for (const name of criterionNames) {
      const score = e.scores.find((s) => s.name === name);
      row[name] = score ? score.score : "";
    }
    return row;
  });
  const csv = toCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBase}-detailed.csv"`);
  res.send(csv);
});

export const listAllEvaluations = asyncHandler(async (req, res) => {
  const events = await Event.find({ directorId: req.director._id }).select("_id name").lean();
  const ids = events.map((e) => e._id);
  const evaluations = await Evaluation.find({ eventId: { $in: ids } })
    .sort({ submittedAt: -1 })
    .limit(200)
    .lean();
  const [teams, evaluators] = await Promise.all([
    Team.find({ eventId: { $in: ids } }).select("name eventId").lean(),
    Evaluator.find({ eventId: { $in: ids } }).select("name eventId").lean(),
  ]);
  const eventMap = Object.fromEntries(events.map((e) => [String(e._id), e]));
  const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t]));
  const evMap = Object.fromEntries(evaluators.map((e) => [String(e._id), e]));

  res.json({
    evaluations: evaluations.map((e) => ({
      _id: e._id,
      eventId: e.eventId,
      eventName: eventMap[String(e.eventId)]?.name,
      teamName: teamMap[String(e.teamId)]?.name,
      evaluatorName: evMap[String(e.evaluatorId)]?.name,
      totalScore: e.totalScore,
      submittedAt: e.submittedAt,
    })),
  });
});
