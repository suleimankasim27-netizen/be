import { Evaluator, Assignment, Evaluation, Event, Team } from "../models/index.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  issueEvaluatorToken,
  sendEvaluatorInvite,
  getOwnedEvaluator,
  publicEvaluatorPayload,
  buildEvaluatorLink,
} from "../services/evaluatorService.js";

export const listEvaluators = asyncHandler(async (req, res) => {
  const evaluators = await Evaluator.find({ eventId: req.event._id }).sort({ createdAt: 1 }).lean();
  res.json({
    evaluators: evaluators.map((e) => publicEvaluatorPayload(e)),
  });
});

export const createEvaluator = asyncHandler(async (req, res) => {
  const { name, email, sendEmail } = req.body;
  const issued = issueEvaluatorToken();
  const evaluator = await Evaluator.create({
    eventId: req.event._id,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    ...issued,
  });

  let emailSent = false;
  if (sendEmail) {
    await sendEvaluatorInvite({ evaluator, event: req.event, token: issued.token });
    emailSent = true;
  }

  const teams = await Team.find({ eventId: req.event._id }).select("_id").lean();
  if (teams.length) {
    await Assignment.insertMany(
      teams.map((team) => ({
        eventId: req.event._id,
        evaluatorId: evaluator._id,
        teamId: team._id,
      })),
      { ordered: false }
    ).catch((err) => {
      if (err.code !== 11000) throw err;
    });
  }

  res.status(201).json({
    evaluator: publicEvaluatorPayload(evaluator, { includeLink: true, token: issued.token }),
    emailSent,
  });
});

export const updateEvaluator = asyncHandler(async (req, res) => {
  const { evaluator } = await getOwnedEvaluator(req.params.id, req.director._id, Event);
  if (req.body.name) evaluator.name = req.body.name.trim();
  if (req.body.email) evaluator.email = req.body.email.toLowerCase().trim();
  await evaluator.save();
  res.json({ evaluator: publicEvaluatorPayload(evaluator) });
});

export const deleteEvaluator = asyncHandler(async (req, res) => {
  const { evaluator } = await getOwnedEvaluator(req.params.id, req.director._id, Event);
  await Promise.all([
    Assignment.deleteMany({ evaluatorId: evaluator._id }),
    Evaluation.deleteMany({ evaluatorId: evaluator._id }),
    Evaluator.deleteOne({ _id: evaluator._id }),
  ]);
  res.json({ success: true });
});

export const sendLink = asyncHandler(async (req, res) => {
  const { evaluator, event } = await getOwnedEvaluator(req.params.id, req.director._id, Event);
  if (evaluator.revoked) throw errors.badRequest("This evaluation link has been revoked.");
  if (evaluator.tokenExpiresAt && evaluator.tokenExpiresAt < new Date()) {
    throw errors.badRequest("This evaluation link has expired. Generate a new link first.");
  }

  const issued = issueEvaluatorToken();
  evaluator.tokenHash = issued.tokenHash;
  evaluator.tokenCreatedAt = issued.tokenCreatedAt;
  evaluator.tokenExpiresAt = issued.tokenExpiresAt;
  evaluator.revoked = false;
  await evaluator.save();

  await sendEvaluatorInvite({ evaluator, event, token: issued.token });
  res.json({
    success: true,
    evaluator: publicEvaluatorPayload(evaluator, { includeLink: true, token: issued.token }),
  });
});

export const resendLink = asyncHandler(async (req, res) => {
  const { evaluator, event } = await getOwnedEvaluator(req.params.id, req.director._id, Event);
  if (evaluator.revoked) throw errors.badRequest("This evaluation link has been revoked.");
  if (evaluator.tokenExpiresAt && evaluator.tokenExpiresAt < new Date()) {
    throw errors.badRequest("This evaluation link has expired. Generate a new link first.");
  }

  const issued = issueEvaluatorToken();
  evaluator.tokenHash = issued.tokenHash;
  evaluator.tokenCreatedAt = issued.tokenCreatedAt;
  evaluator.tokenExpiresAt = issued.tokenExpiresAt;
  await evaluator.save();

  await sendEvaluatorInvite({ evaluator, event, token: issued.token });
  res.json({
    success: true,
    evaluator: publicEvaluatorPayload(evaluator, { includeLink: true, token: issued.token }),
  });
});

export const revokeLink = asyncHandler(async (req, res) => {
  const { evaluator } = await getOwnedEvaluator(req.params.id, req.director._id, Event);
  evaluator.revoked = true;
  await evaluator.save();
  res.json({ success: true, evaluator: publicEvaluatorPayload(evaluator) });
});

export const regenerateLink = asyncHandler(async (req, res) => {
  const { evaluator } = await getOwnedEvaluator(req.params.id, req.director._id, Event);
  const issued = issueEvaluatorToken();
  evaluator.tokenHash = issued.tokenHash;
  evaluator.tokenCreatedAt = issued.tokenCreatedAt;
  evaluator.tokenExpiresAt = issued.tokenExpiresAt;
  evaluator.revoked = false;
  await evaluator.save();
  res.json({
    evaluator: publicEvaluatorPayload(evaluator, { includeLink: true, token: issued.token }),
  });
});

export const copyLink = asyncHandler(async (req, res) => {
  const { evaluator } = await getOwnedEvaluator(req.params.id, req.director._id, Event);
  if (evaluator.revoked) throw errors.badRequest("This evaluation link has been revoked.");
  const issued = issueEvaluatorToken();
  evaluator.tokenHash = issued.tokenHash;
  evaluator.tokenCreatedAt = issued.tokenCreatedAt;
  evaluator.tokenExpiresAt = issued.tokenExpiresAt;
  evaluator.revoked = false;
  await evaluator.save();
  res.json({
    evaluator: publicEvaluatorPayload(evaluator, { includeLink: true, token: issued.token }),
    link: buildEvaluatorLink(issued.token),
  });
});
