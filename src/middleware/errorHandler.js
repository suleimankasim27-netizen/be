import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export function notFoundHandler(req, res, next) {
  next(new AppError("The requested resource was not found.", 404, "NOT_FOUND"));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    const message =
      field === "email"
        ? "An account with this email already exists."
        : "This record already exists.";
    return res.status(409).json({ error: message, code: "CONFLICT" });
  }

  if (err.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({
      error: first?.message || "Invalid data provided.",
      code: "VALIDATION_ERROR",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid identifier provided.", code: "BAD_REQUEST" });
  }

  const status = err.statusCode || 500;
  const message =
    status >= 500 && env.nodeEnv === "production"
      ? "Something went wrong. Please try again."
      : err.message || "Something went wrong. Please try again.";

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: message,
    code: err.code || "INTERNAL_ERROR",
  });
}
