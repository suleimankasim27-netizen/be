import crypto from "crypto";

export function generateEvaluatorToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function tokenExpiryDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
