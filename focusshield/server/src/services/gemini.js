import { GoogleGenerativeAI } from "@google/generative-ai";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildPrompt({ trigger, recentPages, metrics, timeContext }) {
  const pages = (recentPages || []).slice(-10).map(p => ({
    domain: p.domain,
    title: p.title,
    seconds: p.seconds
  }));

  return `
Return ONLY valid JSON. No markdown. No extra keys.

Schema:
{
  "summary": string,
  "insight": string,
  "microResets": [string, string, string],
  "nextActionSuggestion": string,
  "tone": "supportive",
  "scoreBreakdown": { "doomscroll": number, "switching": number, "refresh": number, "lateNight": number }
}

Constraints:
- Be supportive and not judgmental.
- Do not mention therapy, diagnoses, ADHD, or medical claims.
- Do not claim you read full page content. Use only metadata provided.
- microResets must be 10–90 seconds each.
- Keep language concise.

Input:
trigger: ${trigger}
timeContext: ${JSON.stringify(timeContext)}
metrics: ${JSON.stringify(metrics)}
recentPages: ${JSON.stringify(pages)}
`;
}

export async function generateCoaching(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = buildPrompt(payload);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4 }
  });

  const text = result.response.text();
  let parsed = safeJsonParse(text);

  // Retry once if invalid JSON
  if (!parsed) {
    const fixPrompt = `Fix this into valid JSON ONLY following the schema above. Input:\n${text}`;
    const retry = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fixPrompt }] }],
      generationConfig: { temperature: 0.2 }
    });
    parsed = safeJsonParse(retry.response.text());
  }

  if (!parsed) {
    // fallback
    parsed = {
      summary: "You have been browsing quickly across multiple pages.",
      insight: "This pattern often leads to reduced focus. A short reset can help you regain control.",
      microResets: [
        "Stand up and take 5 slow breaths.",
        "Write one sentence: what is the next task you want to finish?",
        "Close one tab you do not need right now."
      ],
      nextActionSuggestion: "Pick one small task and work for 10 minutes.",
      tone: "supportive",
      scoreBreakdown: { doomscroll: 0, switching: 0, refresh: 0, lateNight: 0 }
    };
  }

  // Ensure microResets length
  if (!Array.isArray(parsed.microResets) || parsed.microResets.length !== 3) {
    parsed.microResets = (Array.isArray(parsed.microResets) ? parsed.microResets.slice(0, 3) : []);
    while (parsed.microResets.length < 3) parsed.microResets.push("Take 10 seconds to reset your posture and breathe slowly.");
  }

  return parsed;
}