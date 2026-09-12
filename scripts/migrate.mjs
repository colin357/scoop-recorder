// Runs `prisma migrate deploy` with retries. Concurrent Vercel builds (or a pooled
// connection) can make Prisma's advisory lock time out; a short backoff fixes it.
import { spawnSync } from "node:child_process";

// Vercel runs one production build at a time, so Prisma's cross-process advisory lock adds
// nothing here and a lingering connection (e.g. from an interrupted build) can hold it for
// many minutes and block every deploy. See https://pris.ly/d/migrate-advisory-locking
const env = { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" };
const attempts = 3;
for (let i = 1; i <= attempts; i++) {
  const res = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env, shell: process.platform === "win32" });
  if (res.status === 0) process.exit(0);
  if (i < attempts) {
    const wait = 10_000 * i;
    console.log(`migrate deploy failed (attempt ${i}/${attempts}); retrying in ${wait / 1000}s…`);
    await new Promise((r) => setTimeout(r, wait));
  }
}
console.error("migrate deploy failed after retries");
process.exit(1);
