import mongoose from "mongoose";
import { EVENT_STATUSES } from "../constants/defaultCriteria.js";

const settingsSchema = new mongoose.Schema(
  {
    allowEvaluatorEdits: { type: Boolean, default: true },
    requireFeedback: { type: Boolean, default: false },
    includeIncompleteInRankings: { type: Boolean, default: true },
    evaluationOpen: { type: Boolean, default: true },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    date: { type: Date },
    location: { type: String, default: "", maxlength: 300 },
    status: { type: String, enum: EVENT_STATUSES, default: "Draft" },
    evaluationStartDate: { type: Date },
    evaluationEndDate: { type: Date },
    directorId: { type: mongoose.Schema.Types.ObjectId, ref: "Director", required: true, index: true },
    settings: {
      type: settingsSchema,
      default: () => ({
        allowEvaluatorEdits: true,
        requireFeedback: false,
        includeIncompleteInRankings: true,
        evaluationOpen: true,
      }),
    },
  },
  { timestamps: true }
);

eventSchema.virtual("isEvaluationClosed").get(function () {
  if (this.status === "Completed" || this.status === "Archived") return true;
  if (this.settings?.evaluationOpen === false) return true;
  return false;
});

export const Event = mongoose.model("Event", eventSchema);
