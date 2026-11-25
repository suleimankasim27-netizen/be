import { Evaluator } from "../models/Evaluator.js";
import { env } from "../config/env.js";
import { generateEvaluatorToken, hashToken, tokenExpiryDate } from "../utils/tokens.js";
import { sendTransactionalEmail, evaluationInviteEmail } from "./emailService.js";
import { errors } from "../utils/AppError.js";

export function buildEvaluatorLink(token) {
  return `${env.frontendUrl.replace(/\/$/, "")}/evaluate/${token}`;
}

export function issueEvaluatorToken() {
  const token = generateEvaluatorToken();
  return {
    token,
    tokenHash: hashToken(token),
    tokenCreatedAt: new Date(),
    tokenExpiresAt: tokenExpiryDate(env.evaluatorTokenDays),
    revoked: false,
  };
}

export async function sendEvaluatorInvite({ evaluator, event, token }) {
  const link = buildEvaluatorLink(token);
  const { subject, html, text } = evaluationInviteEmail({
    evaluatorName: evaluator.name,
    eventName: event.name,
    link,
  });

  await sendTransactionalEmail({
    to: evaluator.email,
    toName: evaluator.name,
    subject,
    html,
    text,
  });

  evaluator.lastEmailSentAt = new Date();
  await evaluator.save();
  return { link };
}

export async function getOwnedEvaluator(evaluatorId, directorId, EventModel) {
  const evaluator = await Evaluator.findById(evaluatorId);
  if (!evaluator) throw errors.notFound("Evaluator");
  const event = await EventModel.findById(evaluator.eventId);
  if (!event || String(event.directorId) !== String(directorId)) {
    throw errors.forbidden();
  }
  return { evaluator, event };
}

export function publicEvaluatorPayload(evaluator, { includeLink = false, token } = {}) {
  const payload = {
    _id: evaluator._id,
    eventId: evaluator.eventId,
    name: evaluator.name,
    email: evaluator.email,
    revoked: evaluator.revoked,
    tokenCreatedAt: evaluator.tokenCreatedAt,
    tokenExpiresAt: evaluator.tokenExpiresAt,
    lastEmailSentAt: evaluator.lastEmailSentAt,
    createdAt: evaluator.createdAt,
  };
  if (includeLink && token) {
    payload.link = buildEvaluatorLink(token);
    payload.token = token;
  }
  return payload;
}
