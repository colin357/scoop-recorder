/** Phone number helpers shared by server and client. Numbers are stored in E.164 (+12395550123). */

/** Accept "(239) 555-0123", "239.555.0123", "+44 20 7946 0958"… US/Canada assumed without a +. */
export function normalizePhone(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  if (t.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** "+12395550123" → "+1 (239) 555-0123"; other countries are shown as stored. */
export function formatPhone(e164: string | null | undefined) {
  if (!e164) return "";
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+1 (${m[1]}) ${m[2]}-${m[3]}` : e164;
}
