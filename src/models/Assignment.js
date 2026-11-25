import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Evaluator", required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

assignmentSchema.index({ eventId: 1, evaluatorId: 1, teamId: 1 }, { unique: true });

export const Assignment = mongoose.model("Assignment", assignmentSchema);
