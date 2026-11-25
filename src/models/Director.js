import mongoose from "mongoose";

const directorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 180,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export const Director = mongoose.model("Director", directorSchema);
