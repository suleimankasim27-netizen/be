import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { isAllowedOrigin } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import evaluatorRoutes from "./routes/evaluatorRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import criterionRoutes from "./routes/criterionRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import evaluateRoutes from "./routes/evaluateRoutes.js";
import overviewRoutes from "./routes/overviewRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) callback(null, true);
        else callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json({ limit: "1mb" }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again shortly.", code: "RATE_LIMIT" },
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/evaluate", evaluateRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/evaluators", evaluatorRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/criteria", criterionRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api", overviewRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
