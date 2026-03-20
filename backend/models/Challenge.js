import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    creatorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    participantUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    rules: {
      minQuestsPerDay: { type: Number, default: 1, min: 1, max: 20 },
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

challengeSchema.index({ creatorUserId: 1, status: 1, createdAt: -1 });
challengeSchema.index({ participantUserIds: 1, status: 1 });

export default mongoose.model("Challenge", challengeSchema);
