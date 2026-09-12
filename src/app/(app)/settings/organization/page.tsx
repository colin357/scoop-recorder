import { requireAdmin } from "@/lib/auth";
import { updateOrgSettingsAction } from "@/app/actions/org";
import { emailConfigured } from "@/lib/email";
import WebhookTest from "./webhook-test";

export default async function OrganizationSettingsPage() {
  const { org } = await requireAdmin();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted">Admins only. Recording behaviour, review, retention, and where notifications go.</p>
      </div>
      <form action={updateOrgSettingsAction} className="space-y-6">
        <section className="card p-5 grid gap-3">
          <h2 className="font-semibold">Basics</h2>
          <div><label>Company name</label><input name="name" defaultValue={org.name} /></div>
        </section>

        <section className="card p-5 grid gap-3">
          <h2 className="font-semibold">Task review</h2>
          <label className="flex items-start gap-3 font-normal">
            <input type="checkbox" name="reviewBeforeAssign" defaultChecked={org.reviewBeforeAssign} className="!w-auto mt-1" />
            <span><span className="font-medium text-ink block">Review AI tasks before teammates are notified</span><span className="text-sm text-muted">Generated tasks stay as drafts on the meeting page until an admin approves them. Admins still get the summary right away.</span></span>
          </label>
        </section>

        <section className="card p-5 grid gap-3">
          <h2 className="font-semibold">Recording consent &amp; retention</h2>
          <div><label>Bot display name in meetings</label><input name="botName" defaultValue={org.botName ?? ""} placeholder={`${org.name} Notetaker`} /></div>
          <label className="flex items-start gap-3 font-normal">
            <input type="checkbox" name="recordingNotice" defaultChecked={org.recordingNotice} className="!w-auto mt-1" />
            <span><span className="font-medium text-ink block">Announce the recording in the meeting chat when the bot joins</span><span className="text-sm text-muted">Recommended. Tells participants the call is being recorded and how to opt out.</span></span>
          </label>
          <div>
            <label>Delete recordings and transcripts after (days)</label>
            <input name="retentionDays" type="number" min={1} defaultValue={org.retentionDays ?? ""} placeholder="Keep forever" className="!w-40" />
            <p className="text-xs text-muted mt-1">Summaries and tasks are kept. Media is removed from storage nightly once older than this.</p>
          </div>
        </section>

        <section className="card p-5 grid gap-3">
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-sm text-muted">
            Email {emailConfigured() ? "is on" : "is not configured yet (set RESEND_API_KEY)"}. Add a channel webhook to post every meeting summary and its tasks.
          </p>
          <div>
            <label>Slack incoming webhook URL</label>
            <input name="slackWebhookUrl" defaultValue={org.slackWebhookUrl ?? ""} placeholder="https://hooks.slack.com/services/…" />
            <p className="text-xs text-muted mt-1">Slack → Apps → Incoming Webhooks → Add to channel. Teammates can add their Slack member ID on their profile to get @mentioned.</p>
          </div>
          <div>
            <label>Microsoft Teams incoming webhook URL</label>
            <input name="teamsWebhookUrl" defaultValue={org.teamsWebhookUrl ?? ""} placeholder="https://….webhook.office.com/…" />
            <p className="text-xs text-muted mt-1">Teams channel → ⋯ → Workflows → “Post to a channel when a webhook request is received”.</p>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primary">Save settings</button>
          <WebhookTest hasSlack={Boolean(org.slackWebhookUrl)} hasTeams={Boolean(org.teamsWebhookUrl)} />
        </div>
      </form>
    </div>
  );
}
