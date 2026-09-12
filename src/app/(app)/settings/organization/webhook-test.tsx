"use client";

import { useState, useTransition } from "react";
import { testWebhookAction } from "@/app/actions/org";

export default function WebhookTest({ hasSlack, hasTeams }: { hasSlack: boolean; hasTeams: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const test = (kind: "slack" | "teams") =>
    start(async () => {
      setMsg(null);
      try { await testWebhookAction(kind); setMsg(`Test message sent to ${kind === "slack" ? "Slack" : "Teams"}.`); }
      catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); }
    });
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      {hasSlack && <button type="button" className="btn-ghost" onClick={() => test("slack")} disabled={pending}>Test Slack</button>}
      {hasTeams && <button type="button" className="btn-ghost" onClick={() => test("teams")} disabled={pending}>Test Teams</button>}
      {msg && <span className="text-muted">{msg}</span>}
    </span>
  );
}
