/**
 * Company details used by the public legal pages (/privacy, /terms).
 * Edit here; both pages read from this object.
 */
export const LEGAL = {
  productName: "Scoop",
  /** Legal name of the operating entity as it should appear in contracts. */
  entityName: "Scoop",
  website: "https://www.scooprecorder.com",
  contactEmail: "support@scooprecorder.com",
  privacyEmail: "privacy@scooprecorder.com",
  /** Governing law for the Terms. */
  governingLaw: "the laws of the United States and of the state in which Scoop is organized",
  effectiveDate: "September 12, 2026",
  /** Third parties that process customer data on Scoop's behalf. */
  subprocessors: [
    { name: "Vercel", purpose: "Application hosting and serverless compute", location: "United States" },
    { name: "Neon", purpose: "Postgres database (accounts, transcripts, summaries, tasks)", location: "United States" },
    { name: "Recall.ai", purpose: "Meeting bot that joins calls, records audio/video and captures captions; short-term media storage", location: "United States" },
    { name: "xAI", purpose: "AI model provider for summaries, task extraction and Ask Rocky (transcript text only)", location: "United States" },
    { name: "Anthropic", purpose: "Alternative AI model provider, used only if configured", location: "United States" },
    { name: "Stripe", purpose: "Payments, subscriptions and invoicing; card details never touch Scoop", location: "United States" },
    { name: "Resend", purpose: "Transactional email (invites, notifications, password resets)", location: "United States" },
    { name: "Google / Microsoft", purpose: "Calendar and sign-in providers you choose to connect (read-only calendar access)", location: "United States" },
  ],
};
