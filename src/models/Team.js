import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    members: { type: String, default: "", maxlength: 2000 },
    logo: { type: String, default: "" },
    pitchNumber: { type: Number },
    website: { type: String, default: "", maxlength: 500 },
    notes: { type: String, default: "", maxlength: 5000 },
  },
  { timestamps: true }
);

teamSchema.index({ eventId: 1, name: 1 }, { unique: true });
teamSchema.index({ eventId: 1, pitchNumber: 1 });

export const Team = mongoose.model("Team", teamSchema);
