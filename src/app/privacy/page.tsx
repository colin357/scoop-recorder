import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";
import { PRICING } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Privacy Policy — Scoop",
  description: "How Scoop collects, uses, stores and protects meeting recordings, transcripts and account data.",
};

export default function PrivacyPage() {
  const { productName: P, entityName, contactEmail, privacyEmail, effectiveDate, subprocessors } = LEGAL;
  return (
    <LegalPage
      title="Privacy Policy"
      effective={effectiveDate}
      intro={`${P} records meetings on your behalf, so we take a clear position: your meetings are yours. This policy explains what we collect, why, who we share it with, and the controls you have.`}
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          {P} is operated by {entityName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) at <a href={LEGAL.website}>{LEGAL.website.replace("https://", "")}</a>. When a company (the &ldquo;Customer&rdquo;) creates a workspace and its team uses {P}, the Customer decides which meetings are recorded and who is on the team. For the content of those meetings, the Customer is the data controller and we act as its processor. For account and billing information about our Customers, we are the controller.
        </p>
        <p>Contact for privacy matters: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <h3>Account and workspace data</h3>
        <ul>
          <li>Name, work email, and a password hash, or the email and name returned by Google or Microsoft if you sign in with them.</li>
          <li>Workspace details: company name, a short description of what your business does, team members with their roles and responsibilities, and projects. This is what {P} uses to decide who should own each task.</li>
          <li>Settings such as recording policy, review mode, retention period, and notification channels (for example a Slack webhook URL).</li>
        </ul>
        <h3>Calendar data</h3>
        <ul>
          <li>If you connect Google Calendar or Microsoft 365, we read upcoming events to find ones with a video-meeting link: title, start and end time, attendees, and the meeting link. Access is <strong>read-only</strong>; we never create, edit or delete events.</li>
          <li>OAuth tokens are encrypted at rest. Disconnecting a calendar deletes the tokens immediately.</li>
        </ul>
        <h3>Meeting content</h3>
        <ul>
          <li>When {P}&rsquo;s recording bot (&ldquo;Rocky&rdquo;) joins a Google Meet, Zoom or Microsoft Teams call, it captures the call&rsquo;s audio and video and the platform&rsquo;s captions, which become the transcript.</li>
          <li>From the transcript we generate a summary, decisions, tasks with owners and due dates, step-by-step guides, and answers to questions you ask about the meeting (&ldquo;Ask Rocky&rdquo;).</li>
          <li>Transcripts you paste or upload manually are treated the same way, without a recording.</li>
        </ul>
        <h3>Billing data</h3>
        <ul>
          <li>Plan, seat count, billing status, and recording hours used. Card numbers are entered directly with Stripe and never reach our servers; we store Stripe&rsquo;s customer and subscription identifiers only.</li>
        </ul>
        <h3>Usage and technical data</h3>
        <ul>
          <li>An activity log of actions taken in your workspace (who created, edited, approved or deleted what), server logs, and AI token counts per meeting so we can monitor cost and reliability.</li>
          <li>We use one strictly necessary cookie to keep you signed in. We do not use advertising or cross-site tracking cookies.</li>
        </ul>
      </section>

      <section>
        <h2>3. How we use it</h2>
        <ul>
          <li>To record and transcribe the meetings you choose, and to produce summaries, tasks and guides from them.</li>
          <li>To route tasks to the right teammate based on the roles and responsibilities your workspace defines, and to notify them by email, Slack or Teams if you turn that on.</li>
          <li>To find upcoming meetings on connected calendars and, depending on your policy, ask before joining or join automatically.</li>
          <li>To run the service: authentication, billing, support, security, and abuse prevention.</li>
          <li>To improve {P}. We do this with aggregate usage metrics. <strong>We do not use your meeting recordings, transcripts or summaries to train AI models</strong>, and our AI providers are contractually restricted from doing so with data we send them.</li>
        </ul>
      </section>

      <section>
        <h2>4. Recording consent</h2>
        <p>
          Laws on recording conversations vary and some require the consent of every participant. {P} helps by having the bot appear as a named participant and, by default, posting a notice in the meeting chat when it joins that the call is being recorded and how to object. The Customer is responsible for turning recording on only where it is lawful and for obtaining any consent required from participants. Participants can ask the host to remove the bot at any time.
        </p>
      </section>

      <section>
        <h2>5. AI processing</h2>
        <p>
          Transcript text (not audio or video) is sent to our AI provider to produce summaries, tasks and answers. Requests are processed and returned; we do not permit the provider to retain your content beyond what is needed to serve the request and meet their legal obligations. AI output can be wrong. Every task links back to the exact moment in the recording so you can check the source, and workspaces can require an admin to review tasks before anyone is notified.
        </p>
      </section>

      <section>
        <h2>6. Who we share it with</h2>
        <p>We do not sell personal data. We share it only with the providers below, who process it under our instructions, and when required by law or to protect the rights and safety of users and the public.</p>
        <table>
          <thead><tr><th>Provider</th><th>Purpose</th><th>Location</th></tr></thead>
          <tbody>
            {subprocessors.map((s) => <tr key={s.name}><td className="font-medium text-ink">{s.name}</td><td>{s.purpose}</td><td>{s.location}</td></tr>)}
          </tbody>
        </table>
        <p>Within your workspace, summaries, tasks and recordings are visible to the teammates your admins add. If your admins connect Slack or Microsoft Teams, meeting summaries and tasks are posted to the channel they chose.</p>
      </section>

      <section>
        <h2>7. Retention and deletion</h2>
        <ul>
          <li><strong>Recordings and transcripts</strong> are kept for the period your workspace admin sets. New workspaces default to {PRICING.defaultRetentionDays} days. A nightly job deletes media older than that from our systems and from the recording provider. Admins can shorten, lengthen or remove the limit.</li>
          <li><strong>Summaries, decisions and tasks</strong> are kept for as long as your workspace exists, because they are the work product your team relies on. Admins can delete individual meetings at any time, which removes everything derived from them.</li>
          <li><strong>Calendar events</strong> are refreshed continuously; past events are pruned automatically.</li>
          <li><strong>Account data</strong> is deleted when a workspace is deleted, except billing records we must keep for tax and accounting purposes (typically seven years) and logs kept briefly for security.</li>
          <li>Admins can export the entire workspace as JSON at any time from the audit log page.</li>
        </ul>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          Data is encrypted in transit (TLS) and at rest by our hosting and database providers. Calendar tokens are additionally encrypted with a key held only by the application. Passwords are stored as salted hashes. Access to production systems is limited to the people who operate {P}. No system is perfectly secure; if we learn of a breach affecting your data we will notify affected Customers without undue delay.
        </p>
      </section>

      <section>
        <h2>9. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, restrict or delete personal data about you, and to object to certain processing. Team members can edit their profile in the app; workspace admins can export or delete data for their workspace. For anything else, or if you appear in a meeting recorded by one of our Customers and want to exercise your rights, email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. Where we act as a processor we will pass the request to the Customer and help them respond. You may also lodge a complaint with your local data protection authority.
        </p>
      </section>

      <section>
        <h2>10. International transfers</h2>
        <p>{P} is hosted in the United States. If you use it from elsewhere, your data is transferred to and processed in the United States by us and the providers listed above. Where required, we rely on standard contractual clauses or an equivalent lawful mechanism for those transfers.</p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>{P} is a business tool and is not directed to anyone under 16. We do not knowingly collect personal data from children; if you believe we have, contact us and we will delete it.</p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>We will post any changes to this policy here and update the effective date. For material changes we will also notify workspace admins by email before they take effect.</p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>{entityName} · <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> · <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. See also our <Link href="/terms">Terms of Service</Link>.</p>
      </section>
    </LegalPage>
  );
}
