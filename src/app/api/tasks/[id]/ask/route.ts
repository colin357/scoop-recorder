import { NextResponse } from "next/server";

export const maxDuration = 120;
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { askAboutTask } from "@/lib/ai";
import { safeJson } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/recall";

export async function POST(req: Request, { params }: RouteContext<"/api/tasks/[id]/ask">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgIds = user.memberships.map((m) => m.orgId);
  const { id } = await params;
  const { question } = (await req.json()) as { question?: string };
  if (!question?.trim()) return NextResponse.json({ error: "Question is required" }, { status: 400 });

  const task = await db.task.findFirst({
    where: { id, orgId: { in: orgIds } },
    include: { assignee: true, meeting: true, steps: { orderBy: { order: "asc" } }, messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const answer = await askAboutTask({
      task: { title: task.title, description: task.description, dueDate: task.dueDate, assigneeName: task.assignee?.name ?? null, steps: task.steps },
      meeting: task.meeting
        ? { title: task.meeting.title, summary: task.meeting.summary, transcript: safeJson<TranscriptSegment[]>(task.meeting.transcript, []) }
        : null,
      history: task.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      question,
    });
    await db.taskMessage.createMany({
      data: [
        { taskId: task.id, role: "user", content: question },
        { taskId: task.id, role: "assistant", content: answer },
      ],
    });
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed" }, { status: 500 });
  }
}
