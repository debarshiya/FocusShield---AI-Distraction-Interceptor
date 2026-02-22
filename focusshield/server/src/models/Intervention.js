import mongoose from "mongoose";

const InterventionSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    ts: { type: Date, index: true, required: true },
    trigger: { type: String, index: true, required: true },

    context: { type: Object, default: {} },
    gemini: { type: Object, default: {} },

    elevenlabs: {
      enabled: { type: Boolean, default: false },
      audioBase64Mp3: { type: String, default: null }
    },

    solana: {
      enabled: { type: Boolean, default: true },
      signature: { type: String, default: null },
      memo: { type: String, default: null }
    }
  },
  { timestamps: true }
);

InterventionSchema.index({ userId: 1, ts: -1 });
export default mongoose.model("Intervention", InterventionSchema);