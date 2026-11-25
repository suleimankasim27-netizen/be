import mongoose from "mongoose";

const evaluatorSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 180 },
    tokenHash: { type: String, required: true, unique: true, index: true },
    tokenCreatedAt: { type: Date, default: Date.now },
    tokenExpiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    lastEmailSentAt: { type: Date },
  },
  { timestamps: true }
);

evaluatorSchema.index({ eventId: 1, email: 1 }, { unique: true });

export const Evaluator = mongoose.model("Evaluator", evaluatorSchema);
