export async function elevenLabsTTSBase64({ apiKey, voiceId, modelId, text }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: modelId })
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`ElevenLabs ${resp.status}: ${t}`);
  }

  const buf = await resp.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  return `data:audio/mpeg;base64,${b64}`;
}