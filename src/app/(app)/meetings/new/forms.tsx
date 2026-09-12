"use client";

import { useActionState, useState } from "react";
import { importTranscriptAction, scheduleBotAction } from "@/app/actions/meetings";

const SAMPLE = `[00:00] Priya: Thanks everyone. Quick sync on the Acme onboarding. Where are we on the proposal?
[00:22] Marcus: Draft is done. I need the pricing table from finance before I send it. Can we get that by Wednesday?
[00:41] Priya: Yes. Dana, can you own the pricing table? Marcus needs it Wednesday so it goes out Thursday.
[00:55] Dana: On it. I'll also pull last quarter's numbers so we can justify the discount.
[01:10] Priya: Great. Second thing: the client asked for a demo environment. Jordan, can you set that up in the next two weeks? Include their logo and a couple of sample projects.
[01:35] Jordan: Sure. I'll need their brand assets. Marcus, can you ask them for it?
[01:44] Marcus: Will do today.
[01:50] Priya: Last one. We decided to move the kickoff to the 24th. I'll send the updated invite. Marcus, after the proposal goes out, schedule a follow-up call for early next week.
[02:15] Marcus: Got it.`;

type Project = { id: string; name: string };

export default function NewMeetingForms({ projects, botAvailable }: { projects: Project[]; botAvailable: boolean }) {
  const [botState, botAction, botPending] = useActionState(scheduleBotAction, {});
  const [importState, importAction, importPending] = useActionState(importTranscriptAction, {});
  const [transcript, setTranscript] = useState("");

  return (
    <div className="space-y-6">
      <form action={botAction} className="card p-6 space-y-4">
        <h2 className="font-semibold">Send the recorder to a call</h2>
        {!botAvailable && (
          <p className="text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-800 p-3">
            Recording bot is not configured. Set <code>RECALL_API_KEY</code> to enable live recording. You can still test the pipeline with a transcript below.
          </p>
        )}
        <div><label>Meeting link</label><input name="meetingUrl" placeholder="https://meet.google.com/abc-defg-hij" required /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label>Title</label><input name="title" placeholder="Weekly client sync" /></div>
          <div><label>Join at (leave blank to join now)</label><input name="joinAt" type="datetime-local" /></div>
        </div>
        <ProjectSelect projects={projects} />
        {botState.error && <p className="text-sm text-red-600">{botState.error}</p>}
        <button className="btn-primary" disabled={botPending || !botAvailable}>{botPending ? "Sending bot…" : "Send recorder"}</button>
      </form>

      <form action={importAction} className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Or import a transcript</h2>
          <button type="button" className="btn-ghost text-xs" onClick={() => setTranscript(SAMPLE)}>Use sample</button>
        </div>
        <p className="text-sm text-slate-500">Paste a transcript from any tool. One line per speaker, like <code>Alice: …</code>, optionally with <code>[mm:ss]</code> timestamps.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label>Title</label><input name="title" placeholder="Acme onboarding sync" /></div>
          <div>
            <label>Platform</label>
            <select name="platform" defaultValue="google_meet">
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="teams">Microsoft Teams</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div><label>Recording link (optional)</label><input name="recordingUrl" placeholder="https://… (mp4 or a share link)" /></div>
        <ProjectSelect projects={projects} />
        <div><label>Transcript</label><textarea name="transcript" rows={10} value={transcript} onChange={(e) => setTranscript(e.target.value)} required /></div>
        {importState.error && <p className="text-sm text-red-600">{importState.error}</p>}
        <button className="btn-primary" disabled={importPending}>{importPending ? "Analyzing with AI…" : "Import and analyze"}</button>
      </form>
    </div>
  );
}

function ProjectSelect({ projects }: { projects: Project[] }) {
  return (
    <div>
      <label>Project (optional)</label>
      <select name="projectId" defaultValue="">
        <option value="">Let the AI pick</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  );
}
