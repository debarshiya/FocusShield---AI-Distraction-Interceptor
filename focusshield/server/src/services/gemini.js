import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Accept tone as string from model, then normalize to enum for your UI.
const OutputSchema = z.object({
  summary: z.string().min(1),
  insight: z.string().min(1),
  microResets: z.array(z.string().min(1)).length(3),
  nextActionSuggestion: z.string().min(1),
  tone: z.string().optional().default("supportive"),
  scoreBreakdown: z.record(z.union([z.number(), z.string()])).optional().default({})
});

function normalizeTone(tone) {
  const t = String(tone || "").toLowerCase();
  if (t.includes("neutral")) return "neutral";
  // anything supportive/encouraging/etc. becomes "supportive"
  return "supportive";
}

function normalizeScoreBreakdown(sb) {
  if (!sb || typeof sb !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(sb)) {
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(num)) out[k] = num;
  }
  return out;
}

function sanitizeOutput(parsed) {
  const out = OutputSchema.parse(parsed);
  return {
    ...out,
    tone: normalizeTone(out.tone),
    scoreBreakdown: normalizeScoreBreakdown(out.scoreBreakdown)
  };
}

function buildPrompt({ trigger, recentPages, metrics, timeContext }) {
  const safePages = (recentPages || []).slice(0, 20).map((p) => ({
    domain: p.domain,
    title: p.title || "",
    seconds: p.seconds
  }));

  return `
You are a focus coach. Be supportive and concise.

Rules:
- Output ONLY valid JSON. No markdown. No commentary. No extra keys.
- Do not claim you read page content. Use only the metadata provided.
- microResets must be exactly 3 items and each describes a 10–90 second action.
- No medical/diagnostic language. No shame.

Schema requirements:
- "tone" must be exactly one of: "supportive" or "neutral"
- "scoreBreakdown" values must be numbers

Return keys exactly:
summary, insight, microResets, nextActionSuggestion, tone, scoreBreakdown

Context:
trigger=${trigger}
timeContext=${JSON.stringify(timeContext)}
metrics=${JSON.stringify(metrics)}
recentPages=${JSON.stringify(safePages)}
`.trim();
}

async function generateAndParse(ai, model, input, overridePrompt = null) {
  const resp = await ai.models.generateContent({
    model,
    contents: overridePrompt ?? buildPrompt(input)
  });

  const text = (resp.text || "").trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Gemini returned non-JSON. First 200 chars: ${text.slice(0, 200)}`);
  }

  return sanitizeOutput(parsed);
}

export async function getGeminiCoaching({ apiKey, model = "gemini-2.5-flash", ...input }) {
  const ai = new GoogleGenAI({ apiKey });

  try {
    return await generateAndParse(ai, model, input);
  } catch (e1) {
    // retry once with stricter "fix" prompt (no extra keys)
    const fixPrompt = `
Fix the following output to match the EXACT JSON schema.
Return ONLY valid JSON (no markdown, no commentary).
Keys must be exactly: summary, insight, microResets, nextActionSuggestion, tone, scoreBreakdown.
tone must be "supportive" or "neutral". scoreBreakdown values must be numbers.

Context:
${buildPrompt(input)}
`.trim();

    try {
      return await generateAndParse(ai, model, input, fixPrompt);
    } catch (e2) {
      // surface the most helpful error
      throw new Error(`Gemini schema/JSON failed. First error: ${e1.message}. Retry error: ${e2.message}`);
    }
  }
}