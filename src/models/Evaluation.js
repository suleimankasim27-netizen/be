import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    criterionId: { type: mongoose.Schema.Types.ObjectId, ref: "Criterion", required: true },
    name: { type: String, required: true },
    score: { type: Number, required: true },
    maxPoints: { type: Number, required: true },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Evaluator", required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    scores: { type: [scoreSchema], required: true },
    totalScore: { type: Number, required: true },
    strengths: { type: String, default: "", maxlength: 5000 },
    improvements: { type: String, default: "", maxlength: 5000 },
    complete: { type: Boolean, default: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

evaluationSchema.index({ eventId: 1, evaluatorId: 1, teamId: 1 }, { unique: true });

export const Evaluation = mongoose.model("Evaluation", evaluationSchema);
