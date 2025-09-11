import mongoose from "mongoose";
const dailyUptimeSchema = new mongoose.Schema(
  {
    computer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Computer",
      index: true,
      required: true,
    },
    date: { type: String, index: true, required: true },
    uptimeMs: { type: Number, default: 0 },
    downtimeMs: { type: Number, default: 0 },
    flaps: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dailyUptimeSchema.index({ computer: 1, date: 1 }, { unique: true });
export default mongoose.model("DailyUptime", dailyUptimeSchema);
