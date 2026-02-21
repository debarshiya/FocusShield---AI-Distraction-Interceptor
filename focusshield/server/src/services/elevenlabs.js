export async function tts({ text }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID missing");

  // ElevenLabs API (v1)
  // Returns mp3 bytes. For hackathon, serve via backend as a data URL endpoint.
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: { stability: 0.5, similarity_boost: 0.7 }
    })
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`ElevenLabs error: ${resp.status} ${err}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  // Return as data URL for simplicity
  return { audioUrl: `data:audio/mpeg;base64,${base64}` };
}