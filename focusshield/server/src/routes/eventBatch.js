import express from "express";
import { z } from "zod";
import { upsertEventBatch } from "../services/aggregates.js";

const router = express.Router();

const Body = z.object({
  userId: z.string().min(1),
  metricsDelta: z.object({
    scroll: z.number().optional().default(0),
    tabSwitch: z.number().optional().default(0),
    refresh: z.number().optional().default(0)
  }).optional().default({}),
  recentPages: z.array(z.object({
    domain: z.string().min(1),
    title: z.string().optional(),
    seconds: z.number().nonnegative()
  })).optional().default([])
});

router.post("/event-batch", async (req, res) => {
  try {
    const body = Body.parse(req.body);
    await upsertEventBatch(body);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default router;