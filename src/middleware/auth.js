import jwt from "jsonwebtoken";
import { Director } from "../models/Director.js";
import { env } from "../config/env.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireDirector = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw errors.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw errors.unauthorized();
  }

  const director = await Director.findById(payload.sub);
  if (!director) throw errors.unauthorized();

  req.director = director;
  next();
});
