import express from "express";
import { z } from "zod";
import Session from "../models/Session.js";
import Intervention from "../models/Intervention.js";

const router = express.Router();

router.get("/dashboard-data", async (req, res) => {
  try {
    const { userId } = z.object({ userId: z.string().min(1) }).parse(req.query);

    const session = await Session.findOne({ userId }).sort({ date: -1 }).lean();
    const recent = await Intervention.find({ userId }).sort({ ts: -1 }).limit(20).lean();

    const timePerDomain = Object.entries(session?.timePerDomainSeconds || {})
      .map(([domain, seconds]) => ({ domain, minutes: Math.round((seconds / 60) * 10) / 10 }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);

    const interventionsByTrigger = Object.entries(session?.interventionsByTrigger || {})
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count);

    const interventionsByHour = Object.entries(session?.interventionsByHour || {})
      .map(([hour, count]) => ({ hour: Number(hour), count }))
      .sort((a, b) => a.hour - b.hour);

    const verifiedReceipts = recent
      .filter(x => x?.solana?.signature)
      .map(x => ({ signature: x.solana.signature, trigger: x.trigger, ts: x.ts }))
      .slice(0, 10);

    res.json({ timePerDomain, interventionsByTrigger, interventionsByHour, verifiedReceipts });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default router;