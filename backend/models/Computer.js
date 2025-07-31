import mongoose from 'mongoose'

const computerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ipAddress: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastChecked: Date,
  lastStatusChange: Date
})

export default mongoose.model('Computer', computerSchema)