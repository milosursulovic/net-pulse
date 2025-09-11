import mongoose from "mongoose";
const pingSampleSchema = new mongoose.Schema({
  computer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Computer",
    index: true,
    required: true,
  },
  at: { type: Date, default: Date.now, index: true },
  alive: { type: Boolean, required: true },
  latencyMs: { type: Number, default: null },
});

pingSampleSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
export default mongoose.model("PingSample", pingSampleSchema);
