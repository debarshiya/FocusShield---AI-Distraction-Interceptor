import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    date: { type: String, index: true, required: true }, // YYYY-MM-DD

    metrics: {
      scrollEvents: { type: Number, default: 0 },
      tabSwitches: { type: Number, default: 0 },
      refreshes: { type: Number, default: 0 },
      highRiskMinutes: { type: Number, default: 0 },
      interventions: { type: Number, default: 0 }
    },

    timePerDomainSeconds: { type: Map, of: Number, default: {} },
    interventionsByTrigger: { type: Map, of: Number, default: {} },
    interventionsByHour: { type: Map, of: Number, default: {} }
  },
  { timestamps: true }
);

SessionSchema.index({ userId: 1, date: 1 }, { unique: true });
export default mongoose.model("Session", SessionSchema);