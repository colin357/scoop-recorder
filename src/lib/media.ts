import { deleteBotMedia, recallConfigured } from "./recall";
import { deleteRecording, twilioConfigured } from "./twilio";

/** Delete a meeting's recording wherever it lives (Recall for video, Twilio for phone). Best effort. */
export async function deleteMeetingMedia(m: { recallBotId: string | null; twilioRecordingSid: string | null }) {
  if (m.recallBotId && recallConfigured()) await deleteBotMedia(m.recallBotId).catch((e) => console.error("deleteBotMedia", m.recallBotId, e));
  if (m.twilioRecordingSid && twilioConfigured()) await deleteRecording(m.twilioRecordingSid).catch((e) => console.error("deleteRecording", m.twilioRecordingSid, e));
}
