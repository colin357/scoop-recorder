import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations should use a direct (unpooled) connection when one is available.
// Neon / Vercel Postgres expose these alongside the pooled DATABASE_URL.
const migrationUrl =
  process.env["DATABASE_URL_UNPOOLED"] ??
  process.env["POSTGRES_URL_NON_POOLING"] ??
  process.env["DIRECT_URL"] ??
  process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: migrationUrl },
});
