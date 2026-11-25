import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Director } from "../models/Director.js";
import { env } from "../config/env.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function signToken(director) {
  return jwt.sign({ sub: String(director._id), role: "director" }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function publicDirector(director) {
  return {
    _id: director._id,
    name: director.name,
    email: director.email,
    createdAt: director.createdAt,
    updatedAt: director.updatedAt,
  };
}

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await Director.findOne({ email: email.toLowerCase().trim() });
  if (existing) throw errors.conflict("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  const director = await Director.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
  });

  const token = signToken(director);
  res.status(201).json({ token, director: publicDirector(director) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const director = await Director.findOne({ email: email.toLowerCase().trim() }).select(
    "+passwordHash"
  );
  if (!director) throw errors.badRequest("Invalid email or password.");

  const match = await bcrypt.compare(password, director.passwordHash);
  if (!match) throw errors.badRequest("Invalid email or password.");

  const token = signToken(director);
  res.json({ token, director: publicDirector(director) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ director: publicDirector(req.director) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (name) req.director.name = name.trim();
  await req.director.save();
  res.json({ director: publicDirector(req.director) });
});
