import { NextResponse } from "next/server";
import { billPhoneOverageForLastMonth, stripeConfigured } from "@/lib/billing";

export const maxDuration = 300;

/** Monthly (1st of the month): invoice last month's phone-call hours beyond the add-on allowance. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ ok: true, skipped: "stripe not configured" });
  const result = await billPhoneOverageForLastMonth();
  return NextResponse.json({ ok: true, ...result });
}
