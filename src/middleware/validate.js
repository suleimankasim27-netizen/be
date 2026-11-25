import { validationResult } from "express-validator";
import { AppError } from "../utils/AppError.js";

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const first = result.array({ onlyFirstError: true })[0];
  next(new AppError(first.msg, 400, "VALIDATION_ERROR"));
}
