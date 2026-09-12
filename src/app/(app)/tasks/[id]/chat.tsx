"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function TaskChat({ taskId, initial, hasMeeting }: { taskId: string; initial: Msg[]; hasMeeting: boolean }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true); setError(null);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    try {
      const res = await fetch(`/api/tasks/${taskId}/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const suggestions = hasMeeting
    ? ["What exactly was I asked to do?", "Why is this due on that date?", "What did the client say about this?"]
    : ["How should I approach this?", "What is the first thing to do?"];

  return (
    <section className="card p-5 space-y-3">
      <h2 className="font-semibold">Ask AI about this task</h2>
      <p className="text-xs text-muted">Answers come from the meeting transcript, with timestamps you can jump to.</p>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm rounded-lg p-3 whitespace-pre-line ${m.role === "user" ? "bg-sky-soft text-merle-deep ml-6" : "bg-paper-2 text-ink-soft mr-6"}`}>{m.content}</div>
        ))}
        {busy && <div className="text-sm text-muted mr-6">Thinking…</div>}
      </div>
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="text-xs rounded-full border border-line px-2.5 py-1 hover:bg-paper-2">{s}</button>)}
        </div>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about this task…" disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>Ask</button>
      </form>
    </section>
  );
}
