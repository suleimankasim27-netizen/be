import mongoose from "mongoose";

const criterionSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 2000 },
    maxPoints: { type: Number, required: true, min: 1, max: 1000 },
    allowedScores: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one allowed score is required.",
      },
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

criterionSchema.index({ eventId: 1, order: 1 });

export const Criterion = mongoose.model("Criterion", criterionSchema);
