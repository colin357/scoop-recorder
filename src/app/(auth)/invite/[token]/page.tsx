import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { acceptInviteAction } from "@/app/actions/auth";
import InviteSignup from "./form";

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const member = await db.membership.findUnique({ where: { inviteToken: token }, include: { org: true } });
  if (!member) {
    return (
      <div className="text-center space-y-2">
        <h1 className="text-lg font-semibold">This invitation isn&apos;t valid anymore</h1>
        <p className="text-sm text-ink-soft">It may have been used already. Ask your admin to send a new one.</p>
        <Link href="/login" className="text-sm text-merle">Sign in</Link>
      </div>
    );
  }
  const user = await getCurrentUser();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Join {member.org.name}</h1>
        <p className="text-sm text-ink-soft">You&apos;ve been added as <b>{member.role || "a team member"}</b>. Scoop will send you tasks from your team&apos;s meetings.</p>
      </div>
      {typeof sp.error === "string" && <p className="text-sm text-clay">{decodeURIComponent(sp.error)}</p>}
      {user ? (
        user.email === member.email ? (
          <form action={acceptInviteAction.bind(null, token)}><button className="btn-primary w-full">Accept as {user.email}</button></form>
        ) : (
          <p className="text-sm text-copper-deep bg-butter-soft border border-copper rounded-md p-3">
            You&apos;re signed in as {user.email}, but this invitation is for {member.email}. Sign out and use that address.
          </p>
        )
      ) : (
        <InviteSignup token={token} email={member.email} name={member.name} />
      )}
    </div>
  );
}
