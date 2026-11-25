import { body } from "express-validator";
import { validate } from "../middleware/validate.js";

export const signupRules = [
  body("name").trim().notEmpty().withMessage("Full name is required.").isLength({ max: 120 }),
  body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Passwords do not match.");
    return true;
  }),
  validate,
];

export const loginRules = [
  body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
  validate,
];

export const eventRules = [
  body("name").trim().notEmpty().withMessage("Event name is required."),
  body("status")
    .optional()
    .isIn(["Draft", "Active", "Completed", "Archived"])
    .withMessage("Invalid event status."),
  validate,
];

export const teamRules = [
  body("name").trim().notEmpty().withMessage("Team name is required."),
  validate,
];

export const evaluatorRules = [
  body("name").trim().notEmpty().withMessage("Full name is required."),
  body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  validate,
];

export const criterionRules = [
  body("name").trim().notEmpty().withMessage("Criterion name is required."),
  body("maxPoints").isFloat({ min: 1 }).withMessage("Maximum points must be at least 1."),
  validate,
];

export const evaluationRules = [
  body("scores").isArray().withMessage("Scores are required."),
  validate,
];
