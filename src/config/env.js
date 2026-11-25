import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(backendRoot, ".env") });

function mongoUri(raw) {
  let value = String(raw || "").trim().replace(/^["']|["']$/g, "");
  if (value.startsWith("MONGODB_URI=")) value = value.slice("MONGODB_URI=".length).trim();
  if (value.startsWith("mongodb://") || value.startsWith("mongodb+srv://")) return value;
  return "mongodb://127.0.0.1:27017/evaluator";
}

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

function parseFrontendOrigins(raw) {
  const origins = String(raw || "http://localhost:5173")
    .split(/[,\s]+/)
    .map(normalizeOrigin)
    .filter(Boolean);
  return [...new Set(origins.length ? origins : ["http://localhost:5173"])];
}

const required = ["MONGODB_URI", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set.`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongodbUri: mongoUri(process.env.MONGODB_URI),
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  brevoApiKey: process.env.BREVO_API_KEY || "",
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || "",
  brevoSenderName: process.env.BREVO_SENDER_NAME || "Pitching Evaluator",
  frontendOrigins: parseFrontendOrigins(process.env.FRONTEND_URL),
  evaluatorTokenDays: Number(process.env.EVALUATOR_TOKEN_DAYS) || 90,
  nodeEnv: process.env.NODE_ENV || "development",
};

env.frontendUrl = env.frontendOrigins[0];

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (env.frontendOrigins.includes(normalized)) return true;

  for (const allowed of env.frontendOrigins) {
    try {
      const allowedHost = new URL(allowed).hostname;
      const requestHost = new URL(normalized).hostname;
      if (!allowedHost.endsWith(".vercel.app") || !requestHost.endsWith(".vercel.app")) continue;
      const project = allowedHost.replace(/\.vercel\.app$/, "");
      if (requestHost === allowedHost || requestHost.startsWith(`${project}-`)) return true;
    } catch {
      continue;
    }
  }
  return false;
}
