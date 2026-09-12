import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Encrypts calendar OAuth tokens at rest when TOKEN_ENCRYPTION_KEY is set.
 * Without a key, values are stored as-is (fine for local dev, set the key in production).
 */
function key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  return raw ? createHash("sha256").update(raw).digest() : null;
}

export function encrypt(plain: string) {
  const k = key();
  if (!k) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `enc:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(value: string) {
  if (!value.startsWith("enc:")) return value;
  const k = key();
  if (!k) throw new Error("TOKEN_ENCRYPTION_KEY is required to read stored tokens");
  const [, iv, tag, data] = value.split(":");
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
