import { Event } from "../models/Event.js";
import { errors } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireEventOwner = asyncHandler(async (req, res, next) => {
  const eventId = req.params.eventId || req.params.id;
  if (!eventId) throw errors.badRequest("Event is required.");

  const event = await Event.findById(eventId);
  if (!event) throw errors.notFound("Event");
  if (String(event.directorId) !== String(req.director._id)) {
    throw errors.forbidden();
  }

  req.event = event;
  next();
});
