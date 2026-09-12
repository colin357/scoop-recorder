# Scoop — meeting recorder that turns calls into assigned tasks

Multi-tenant SaaS that records Google Meet, Zoom and Microsoft Teams meetings, summarizes them, and turns every action item into a task with an owner, a deadline, and a step-by-step guide.

Production: https://www.scooprecorder.com

## What it does

- **Record any meeting.** Paste a Meet / Zoom / Teams link, or connect a calendar. A notetaker bot (via [Recall.ai](https://recall.ai)) joins now or at the scheduled time, records the call, and produces a transcript. Transcripts can also be imported by hand.
- **Calendar auto-record.** Connect Google Calendar or Microsoft 365. A cron syncs upcoming meetings that have a video link. Per-org policy: record everything automatically, ask first (dashboard list plus an in-app pop-up before the meeting), or off.
- **Summarize automatically.** When the call ends, the AI produces a summary, key points, and decisions.
- **Create and assign tasks.** Each commitment in the transcript becomes a task. The AI assigns it to the team member whose role and responsibilities fit best, explains why, sets a deadline (explicit dates from the call, otherwise an estimate), and writes a 2-6 step guide where each step has its own due date.
- **Project guessing.** The business description gathered during onboarding lets the AI propose projects up front, file each meeting under the right one, create a new project when a meeting is clearly about a new client or initiative, and suggest missing projects from the Projects page.
- **Context on demand.** Every task links to the recording at the second it was discussed, shows the verbatim quote, and has an "Ask AI" chat that answers from the transcript with jumpable timestamps.
- **Team features.** Email invites with magic links, task assignment and summary emails (Resend), Slack and Teams channel posts via incoming webhooks, admin vs member roles, an optional "review AI tasks before teammates are notified" mode, task comments, and a per-task activity trail.
- **Governance.** Recording consent announcement when the bot joins, configurable bot name, retention limit that purges recordings and transcripts nightly, an org-wide audit log, and full JSON export. Operators get a cross-organization usage dashboard at `/admin` (gated by `SUPERADMIN_EMAILS`).
- **Search.** Full-text across meeting titles, summaries, transcripts and tasks, with jump-to-moment links. ⌘K opens it.
- **Track work.** List and board views, filterable by project, assignee ("me"), and due date (overdue / today / this week / later / none). Steps can be ticked off individually.
- **Chat onboarding.** Rocky, the Aussie mascot, walks new users through setup in a conversation, dropping in mini-forms for the team roster and for confirming proposed projects. A classic form wizard is at `/onboarding/form`.

## Stack

Next.js 16 (App Router, server actions), TypeScript, Tailwind v4, Prisma 7 on Postgres, Recall.ai for the meeting bot. AI runs on xAI Grok or Anthropic Claude behind a small provider layer (`src/lib/llm.ts`), both using schema-validated JSON output.

## Run locally

```bash
cp .env.example .env         # DATABASE_URL (Postgres), XAI_API_KEY or ANTHROPIC_API_KEY, RECALL_API_KEY for live recording
npm install
npx prisma migrate deploy    # applies migrations to DATABASE_URL
npm run dev
```

You need a Postgres database. A Neon branch or `docker run -p 5432:5432 -e POSTGRES_PASSWORD=pw postgres:16` both work. Open http://localhost:3000, sign up, complete onboarding, then **Record a meeting → Import a transcript → Use sample** to see the pipeline without a live call.

## Deploying on Vercel

1. Attach a Postgres store (Storage → Neon) so `DATABASE_URL` is set.
2. Environment variables: `APP_URL=https://www.scooprecorder.com` (the apex redirects to www, so the www form is canonical), `XAI_API_KEY` or `ANTHROPIC_API_KEY`, `RECALL_API_KEY`, `RECALL_WEBHOOK_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, plus the calendar OAuth values below.
3. Deploy. The build command is `prisma migrate deploy && next build`, so migrations run on every deploy.
4. Requests that arrive on the `*.vercel.app` production alias are redirected to `APP_URL` by `src/proxy.ts`.

## Email and chat notifications

Set `RESEND_API_KEY` and `EMAIL_FROM` for invites, task assignments, summaries and password resets; without a key, emails are printed to the server log. Admins add a Slack incoming webhook and/or a Microsoft Teams workflow webhook under **Settings → Organization**; members can add their Slack member ID on their profile to be @mentioned.

## AI provider

Set `XAI_API_KEY` to use Grok (default model `grok-4`, override with `XAI_MODEL`) or `ANTHROPIC_API_KEY` to use Claude. If both are set, xAI is used unless `AI_PROVIDER=anthropic`.

## Live recording setup (Recall.ai)

1. Set `RECALL_API_KEY` (and `RECALL_REGION` if not `us-west-2`).
2. Bots are created with meeting-captions transcription and a mixed MP4 recording.
3. In the Recall dashboard, add `https://www.scooprecorder.com/api/webhooks/recall?secret=<RECALL_WEBHOOK_SECRET>` as a webhook endpoint subscribed to **bot status change** events and **transcript.done / transcript.failed**. This is how the app learns a recording finished; nothing is configured per bot.
4. Optionally set `RECALL_WEBHOOK_SECRET` and configure Recall to send it as `x-webhook-secret` or `?secret=`.

## Calendar auto-record setup

1. **Google:** in Google Cloud Console create an OAuth client (Web application) with redirect URI `https://www.scooprecorder.com/api/calendar/google/callback`, enable the Google Calendar API, add scopes `calendar.readonly` and `userinfo.email` on the consent screen, and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
2. **Microsoft:** in Entra ID register a multitenant + personal accounts app with Web redirect URI `https://www.scooprecorder.com/api/calendar/microsoft/callback`, delegated permissions `Calendars.Read`, `User.Read`, `offline_access`, and set `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`.
3. Set `TOKEN_ENCRYPTION_KEY` (any long random string) so stored tokens are encrypted at rest, and `CRON_SECRET` so only Vercel Cron can call `/api/cron/sync-calendars`.
4. `vercel.json` schedules the sync every 10 minutes. Users connect their calendar under **Calendar** in the app and pick a policy.

## Billing (Stripe)

1. Set `STRIPE_SECRET_KEY` (test key first) and deploy. On first use the app creates a "Scoop" product, monthly and annual per-seat prices for the Starter and Team plans, and a Customer Portal configuration in that Stripe account. Nothing else to configure in the dashboard.
2. Add a webhook in Stripe → Developers → Webhooks pointing at `https://www.scooprecorder.com/api/webhooks/stripe` with `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and set `STRIPE_WEBHOOK_SECRET`.
3. Flow: after onboarding the admin lands on `/billing/start`, picks monthly or annual, and Stripe Checkout starts a 14-day trial with a card on file. Seats = members who have joined; the quantity is updated on invite acceptance and removal. Each seat adds pooled recording hours per calendar month (Starter 10, Team 20); `/api/cron/bill-overage` invoices the previous month's overage at $1.50/hour on the 1st.
4. Operators can mark an organization complimentary from `/admin`. Plans, prices and allowances live in `src/lib/billing.ts` (`PLANS`, `PRICING`); change them there before the prices are created, or create new prices with new lookup keys.

## Layout

```
prisma/schema.prisma        Organization, User, Session, Membership, Project, Meeting, Task, TaskStep,
                            TaskMessage, CalendarConnection, CalendarEvent, OnboardingDraft
src/lib/urls.ts             appUrl(): the one place the public origin is defined
src/lib/llm.ts              provider layer: xAI (Grok) or Anthropic (Claude)
src/lib/ai.ts               analyzeMeeting (summary + tasks + project guess) and askAboutTask
src/lib/onboarding-ai.ts    conversational onboarding turns + project suggestions
src/lib/recall.ts           Recall.ai client + transcript parsing
src/lib/calendar.ts         Google / Microsoft OAuth, event sync, auto-record scheduling
src/lib/pipeline.ts         processMeeting / ingestFromRecall
src/lib/auth.ts             cookie sessions, signUp / signIn, requireOrg
src/components/mascot.tsx   Rocky the Aussie mascot (inline SVG, several poses)
src/app/actions/*           server actions (auth, onboarding, meetings, tasks, team, calendar)
src/app/(app)/*             dashboard, meetings, tasks, projects, calendar and team settings
src/app/api/webhooks/recall Recall webhook
src/app/api/calendar/*      OAuth start/callback, upcoming-meetings feed
src/app/api/cron/*          calendar sync (Vercel Cron)
src/app/api/tasks/[id]/ask  Ask-AI endpoint
src/proxy.ts                redirect *.vercel.app → APP_URL
```

## Notes for production

- Move `processMeeting` / `ingestFromRecall` onto a job queue; they currently run inline (import) or via `after()` (webhook).
- Add email invites. The data model already supports invited members who link on signup.
