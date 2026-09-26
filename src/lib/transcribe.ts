import type { TranscriptSegment } from "./recall";
import { fetchTwilioMedia } from "./twilio";

/**
 * Speech-to-text for phone recordings (video meetings use the platform's
 * captions via Recall). Deepgram Nova-3; DEEPGRAM_API_BASE overrides the host
 * for local testing.
 */
export function deepgramConfigured() {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

type Utterance = { start: number; end: number; transcript: string; channel?: number; speaker?: number };

/**
 * Transcribe a Twilio recording. Two-channel recordings (Rocky called both
 * people) keep each person on their own channel, so `speakerNames[channel]`
 * labels them exactly; one-channel recordings are split by voice instead.
 */
export async function transcribeTwilioRecording(opts: { mediaUrl: string; channels: number; speakerNames?: string[] }): Promise<TranscriptSegment[]> {
  if (!deepgramConfigured()) throw new Error("Transcription is not configured (DEEPGRAM_API_KEY missing).");
  const media = await fetchTwilioMedia(opts.mediaUrl);
  if (!media.ok || !media.body) throw new Error(`Could not download the call recording (${media.status}).`);

  const multichannel = opts.channels > 1;
  const q = new URLSearchParams({ model: "nova-3", smart_format: "true", punctuate: "true", utterances: "true", ...(multichannel ? { multichannel: "true" } : { diarize: "true" }) });
  const base = (process.env.DEEPGRAM_API_BASE ?? "https://api.deepgram.com").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/listen?${q}`, {
    method: "POST",
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, "Content-Type": media.headers.get("content-type") ?? "audio/mpeg" },
    body: media.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  if (!res.ok) throw new Error(`Transcription failed: ${res.status} ${await res.text()}`);

  const j = (await res.json()) as { results?: { utterances?: Utterance[] } };
  const names = opts.speakerNames ?? [];
  return (j.results?.utterances ?? [])
    .filter((u) => u.transcript?.trim())
    .sort((a, b) => a.start - b.start)
    .map((u) => {
      const idx = multichannel ? (u.channel ?? 0) : (u.speaker ?? 0);
      return { speaker: names[idx] ?? `Speaker ${idx + 1}`, startSec: Math.round(u.start), endSec: Math.round(u.end), text: u.transcript.trim() };
    });
}
