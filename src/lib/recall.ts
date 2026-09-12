import { appUrl } from "./urls";

/**
 * Recall.ai client. Recall runs a bot that joins Google Meet / Zoom / Teams
 * calls by URL, records them, and produces a transcript. We use it as the
 * single integration surface for all three platforms.
 *
 * Docs: https://docs.recall.ai
 */

const REGION = process.env.RECALL_REGION ?? "us-west-2";
const BASE = `https://${REGION}.recall.ai/api/v1`;

export function recallConfigured() {
  return Boolean(process.env.RECALL_API_KEY);
}

async function recallFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recall ${init.method ?? "GET"} ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export type RecallBot = {
  id: string;
  status_changes?: { code: string; created_at: string }[];
  recordings?: {
    id: string;
    started_at?: string;
    completed_at?: string;
    media_shortcuts?: {
      video_mixed?: { data?: { download_url?: string } };
      transcript?: { data?: { download_url?: string } };
    };
  }[];
};

/**
 * Send a bot to a meeting. `joinAt` schedules it; omit to join now.
 * Completion events (bot.done, transcript.done) arrive via the webhook endpoint
 * configured in the Recall dashboard, not per bot.
 */
export async function createBot(input: { meetingUrl: string; botName: string; joinAt?: Date }) {
  return recallFetch<RecallBot>("/bot/", {
    method: "POST",
    body: JSON.stringify({
      meeting_url: input.meetingUrl,
      bot_name: input.botName,
      join_at: input.joinAt?.toISOString(),
      recording_config: {
        transcript: { provider: { meeting_captions: {} } },
        video_mixed_mp4: {},
      },
      metadata: { app: "scoop", app_url: appUrl() },
    }),
  });
}

export async function getBot(botId: string) {
  return recallFetch<RecallBot>(`/bot/${botId}/`);
}

export async function removeBot(botId: string) {
  return recallFetch<unknown>(`/bot/${botId}/leave_call/`, { method: "POST" });
}

export type TranscriptSegment = {
  speaker: string;
  startSec: number;
  endSec: number;
  text: string;
};

/**
 * Recall transcripts are an array of participant turns, each with word-level
 * timestamps. Flatten to one segment per turn.
 */
export async function fetchTranscript(bot: RecallBot): Promise<TranscriptSegment[]> {
  const url = bot.recordings?.[0]?.media_shortcuts?.transcript?.data?.download_url;
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Transcript download failed: ${res.status}`);
  type Turn = {
    participant?: { name?: string };
    words?: { text: string; start_timestamp?: { relative?: number }; end_timestamp?: { relative?: number } }[];
  };
  const turns = (await res.json()) as Turn[];
  return turns
    .filter((t) => t.words?.length)
    .map((t) => {
      const words = t.words!;
      return {
        speaker: t.participant?.name ?? "Unknown",
        startSec: Math.round(words[0].start_timestamp?.relative ?? 0),
        endSec: Math.round(words[words.length - 1].end_timestamp?.relative ?? 0),
        text: words.map((w) => w.text).join(" "),
      };
    });
}

export function recordingUrlFromBot(bot: RecallBot) {
  return bot.recordings?.[0]?.media_shortcuts?.video_mixed?.data?.download_url ?? null;
}

/** Parse a pasted transcript (e.g. "[00:12] Alice: text" or "Alice: text") into segments. */
export function parsePlainTranscript(raw: string): TranscriptSegment[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: TranscriptSegment[] = [];
  let cursor = 0;
  for (const line of lines) {
    const m = line.match(/^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(?:-\s*)?([^:]{1,60}):\s*(.+)$/);
    if (m) {
      const [, a, b, c, speaker, text] = m;
      const sec = c ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
      out.push({ speaker: speaker.trim(), startSec: sec, endSec: sec, text });
      cursor = sec;
      continue;
    }
    const m2 = line.match(/^([^:]{1,60}):\s*(.+)$/);
    if (m2) {
      out.push({ speaker: m2[1].trim(), startSec: cursor, endSec: cursor, text: m2[2] });
      cursor += Math.max(4, Math.round(m2[2].split(/\s+/).length / 2.5));
      continue;
    }
    if (out.length) out[out.length - 1].text += " " + line;
    else out.push({ speaker: "Speaker", startSec: cursor, endSec: cursor, text: line });
  }
  return out;
}
