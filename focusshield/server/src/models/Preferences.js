import mongoose from "mongoose";

const PreferencesSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true, index: true, required: true },
    highRiskDomains: { type: [String], default: ["x.com", "reddit.com", "tiktok.com", "instagram.com"] },
    voiceEnabled: { type: Boolean, default: false },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startHour: { type: Number, default: 0 },
      endHour: { type: Number, default: 7 }
    },
    thresholds: {
      doomscrollMinutes: { type: Number, default: 10 },
      doomscrollScrollEvents10Min: { type: Number, default: 80 },
      tabSwitches5Min: { type: Number, default: 12 },
      refreshes3Min: { type: Number, default: 4 },
      lateNightHighRiskMinutes15Min: { type: Number, default: 7 },
      cooldownMinutes: { type: Number, default: 8 }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Preferences", PreferencesSchema);