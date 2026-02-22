import express from "express";
import crypto from "crypto";
import { z } from "zod";

import Preferences from "../models/Preferences.js";
import Intervention from "../models/Intervention.js";

import { getGeminiCoaching } from "../services/gemini.js";
import { elevenLabsTTSBase64 } from "../services/elevenlabs.js";
import { writeInterventionReceipt } from "../services/solana.js";
import { bumpIntervention } from "../services/aggregates.js";

const router = express.Router();

const Body = z.object({
  userId: z.string().min(1),
  trigger: z.string().min(1),
  recentPages: z.array(z.object({
    domain: z.string().min(1),
    title: z.string().optional().default(""),
    seconds: z.number().nonnegative()
  })).optional().default([]),
  metrics: z.record(z.any()).optional().default({}),
  timeContext: z.object({
    localHour: z.number().int().min(0).max(23).optional()
  }).optional().default({})
});

function ttsScript(g) {
  return [
    "Focus check.",
    `Summary: ${g.summary}`,
    `Try this: ${g.microResets[0]}`,
    `Next: ${g.nextActionSuggestion}`
  ].join(" ");
}

router.post("/analyze-intervention", async (req, res) => {
  try {
    const body = Body.parse(req.body);

    let prefs = await Preferences.findOne({ userId: body.userId });
    if (!prefs) prefs = await Preferences.create({ userId: body.userId });

    const interventionId = crypto.randomUUID();
    const now = new Date();
    const hour = body.timeContext.localHour ?? now.getHours();

    const gemini = await getGeminiCoaching({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
      trigger: body.trigger,
      recentPages: body.recentPages,
      metrics: body.metrics,
      timeContext: { localHour: hour }
    });

    const doc = await Intervention.create({
      userId: body.userId,
      ts: now,
      trigger: body.trigger,
      context: { recentPages: body.recentPages, metrics: body.metrics, timeContext: { localHour: hour } },
      gemini,
      elevenlabs: { enabled: !!prefs.voiceEnabled },
      solana: { enabled: true }
    });

    let audio = null;
    if (prefs.voiceEnabled) {
      const audioBase64Mp3 = await elevenLabsTTSBase64({
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: process.env.ELEVENLABS_VOICE_ID,
        modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
        text: ttsScript(gemini)
      });
      audio = { audioBase64Mp3 };
      doc.elevenlabs.audioBase64Mp3 = audioBase64Mp3;
      await doc.save();
    }

    const receipt = await writeInterventionReceipt({
      rpcUrl: process.env.SOLANA_RPC_URL,
      secretKeyJson: process.env.SOLANA_PRIVATE_KEY_JSON,
      interventionId,
      trigger: body.trigger
    });

    doc.solana.signature = receipt.signature;
    doc.solana.memo = receipt.memo;
    await doc.save();

    await bumpIntervention({ userId: body.userId, trigger: body.trigger, hour });

    res.json({
      interventionId,
      gemini,
      audio,
      solana: { signature: receipt.signature }
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default router;