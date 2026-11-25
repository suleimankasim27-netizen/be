export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errors = {
  invalidLink: () => new AppError("This evaluation link is invalid.", 404, "INVALID_LINK"),
  revokedLink: () => new AppError("This evaluation link has been revoked.", 403, "REVOKED_LINK"),
  expiredLink: () => new AppError("This evaluation link has expired.", 403, "EXPIRED_LINK"),
  eventClosed: () => new AppError("This event has been closed.", 403, "EVENT_CLOSED"),
  alreadySubmitted: () =>
    new AppError("You have already submitted this evaluation.", 409, "ALREADY_SUBMITTED"),
  notAssigned: () =>
    new AppError("You are not assigned to evaluate this team.", 403, "NOT_ASSIGNED"),
  unauthorized: () => new AppError("Please sign in to continue.", 401, "UNAUTHORIZED"),
  forbidden: () => new AppError("You do not have permission to do that.", 403, "FORBIDDEN"),
  notFound: (label = "Resource") => new AppError(`${label} was not found.`, 404, "NOT_FOUND"),
  conflict: (message) => new AppError(message, 409, "CONFLICT"),
  badRequest: (message) => new AppError(message, 400, "BAD_REQUEST"),
};
