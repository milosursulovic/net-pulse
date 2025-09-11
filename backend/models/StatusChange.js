// models/StatusChange.js — samo na promenu stanja
import mongoose from "mongoose";
const statusChangeSchema = new mongoose.Schema({
  computer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Computer",
    index: true,
    required: true,
  },
  at: { type: Date, default: Date.now, index: true },
  online: { type: Boolean, required: true }, // novo stanje
});
export default mongoose.model("StatusChange", statusChangeSchema);
