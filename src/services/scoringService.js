import { Evaluation } from "../models/Evaluation.js";
import { Assignment } from "../models/Assignment.js";
import { Team } from "../models/Team.js";
import { Criterion } from "../models/Criterion.js";
import { Evaluator } from "../models/Evaluator.js";

export function recalculateTotal(scores) {
  return scores.reduce((sum, item) => sum + Number(item.score || 0), 0);
}

export function roundOne(value) {
  return Math.round(Number(value) * 10) / 10;
}

export function isFinishedEvaluation(evaluation) {
  return evaluation?.complete !== false;
}

export async function getEventProgress(eventId) {
  const [assignments, evaluations, evaluators] = await Promise.all([
    Assignment.find({ eventId }).lean(),
    Evaluation.find({ eventId }).lean(),
    Evaluator.find({ eventId }).select("name email").lean(),
  ]);

  const finished = evaluations.filter(isFinishedEvaluation);
  const expected = assignments.length;
  const completed = finished.length;
  const remaining = Math.max(expected - completed, 0);

  const evalByPair = new Set(finished.map((e) => `${e.evaluatorId}:${e.teamId}`));

  const byEvaluator = evaluators.map((ev) => {
    const assigned = assignments.filter((a) => String(a.evaluatorId) === String(ev._id));
    const done = assigned.filter((a) => evalByPair.has(`${a.evaluatorId}:${a.teamId}`)).length;
    const total = assigned.length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return {
      evaluatorId: ev._id,
      name: ev.name,
      email: ev.email,
      completed: done,
      total,
      percent,
    };
  });

  return { expected, completed, remaining, byEvaluator };
}

export async function getRankings(event, options = {}) {
  const includeIncomplete = options.includeIncomplete ?? event.settings?.includeIncompleteInRankings;
  const [teams, assignments, evaluations, criteria] = await Promise.all([
    Team.find({ eventId: event._id }).sort({ pitchNumber: 1, name: 1 }).lean(),
    Assignment.find({ eventId: event._id }).lean(),
    Evaluation.find({ eventId: event._id }).lean(),
    Criterion.find({ eventId: event._id, active: true }).sort({ order: 1 }).lean(),
  ]);

  const assignedCountByTeam = {};
  for (const a of assignments) {
    const key = String(a.teamId);
    assignedCountByTeam[key] = (assignedCountByTeam[key] || 0) + 1;
  }

  const evalsByTeam = {};
  for (const e of evaluations.filter(isFinishedEvaluation)) {
    const key = String(e.teamId);
    if (!evalsByTeam[key]) evalsByTeam[key] = [];
    evalsByTeam[key].push(e);
  }

  const rows = teams.map((team) => {
    const teamId = String(team._id);
    const teamEvals = evalsByTeam[teamId] || [];
    const expected = assignedCountByTeam[teamId] || 0;
    const completedCount = teamEvals.length;
    const complete = expected > 0 && completedCount >= expected;
    const hasScores = completedCount > 0;
    const averageScore = hasScores
      ? roundOne(teamEvals.reduce((s, e) => s + e.totalScore, 0) / completedCount)
      : null;

    const criterionAverages = criteria.map((c) => {
      const scores = teamEvals
        .map((e) => e.scores.find((s) => String(s.criterionId) === String(c._id)))
        .filter(Boolean)
        .map((s) => s.score);
      return {
        criterionId: c._id,
        name: c.name,
        maxPoints: c.maxPoints,
        average: scores.length ? roundOne(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      };
    });

    return {
      teamId: team._id,
      name: team.name,
      pitchNumber: team.pitchNumber,
      logo: team.logo,
      expectedEvaluations: expected,
      completedEvaluations: completedCount,
      complete,
      incomplete: !complete,
      averageScore,
      criterionAverages,
    };
  });

  const ranked = includeIncomplete
    ? rows.filter((r) => r.averageScore !== null)
    : rows.filter((r) => r.complete && r.averageScore !== null);

  ranked.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
  ranked.forEach((row, i) => {
    row.rank = i + 1;
  });

  const incompleteTeams = rows.filter((r) => !r.complete);

  return {
    includeIncomplete: Boolean(includeIncomplete),
    rankings: ranked,
    incompleteTeams,
    allTeams: rows,
    maxTotal: criteria.reduce((s, c) => s + c.maxPoints, 0),
    criteria: criteria.map((c) => ({ _id: c._id, name: c.name, maxPoints: c.maxPoints })),
  };
}

export async function getTeamResults(event, teamId) {
  const [team, criteria, evaluations, assignments, evaluators] = await Promise.all([
    Team.findOne({ _id: teamId, eventId: event._id }).lean(),
    Criterion.find({ eventId: event._id, active: true }).sort({ order: 1 }).lean(),
    Evaluation.find({ eventId: event._id, teamId }).lean(),
    Assignment.find({ eventId: event._id, teamId }).lean(),
    Evaluator.find({ eventId: event._id }).select("name email").lean(),
  ]);

  if (!team) return null;

  const evaluatorMap = Object.fromEntries(evaluators.map((e) => [String(e._id), e]));
  const maxTotal = criteria.reduce((s, c) => s + c.maxPoints, 0);
  const finished = evaluations.filter(isFinishedEvaluation);
  const overallAverage = finished.length
    ? roundOne(finished.reduce((s, e) => s + e.totalScore, 0) / finished.length)
    : null;

  const criterionAverages = criteria.map((c) => {
    const scores = finished
      .map((e) => e.scores.find((s) => String(s.criterionId) === String(c._id)))
      .filter(Boolean)
      .map((s) => s.score);
    return {
      criterionId: c._id,
      name: c.name,
      description: c.description,
      maxPoints: c.maxPoints,
      average: scores.length ? roundOne(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  });

  const evaluatorResults = evaluations.map((e) => {
    const ev = evaluatorMap[String(e.evaluatorId)];
    return {
      evaluationId: e._id,
      evaluatorId: e.evaluatorId,
      evaluatorName: ev?.name || "Evaluator",
      totalScore: e.totalScore,
      maxTotal,
      scores: e.scores,
      strengths: e.strengths,
      improvements: e.improvements,
      submittedAt: e.submittedAt,
      complete: isFinishedEvaluation(e),
    };
  });

  return {
    team,
    overallAverage,
    maxTotal,
    expectedEvaluations: assignments.length,
    completedEvaluations: finished.length,
    complete: assignments.length > 0 && finished.length >= assignments.length,
    criterionAverages,
    evaluatorResults,
  };
}
