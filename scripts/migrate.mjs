// Runs `prisma migrate deploy` with retries. Concurrent Vercel builds (or a pooled
// connection) can make Prisma's advisory lock time out; a short backoff fixes it.
import { spawnSync } from "node:child_process";

const attempts = 5;
for (let i = 1; i <= attempts; i++) {
  const res = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
  if (res.status === 0) process.exit(0);
  if (i < attempts) {
    const wait = 10_000 * i;
    console.log(`migrate deploy failed (attempt ${i}/${attempts}); retrying in ${wait / 1000}s…`);
    await new Promise((r) => setTimeout(r, wait));
  }
}
console.error("migrate deploy failed after retries");
process.exit(1);
