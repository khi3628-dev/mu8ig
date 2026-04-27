#!/usr/bin/env node
// Apply Prisma schema to the configured database — only when DATABASE_URL is set.
// On Vercel: if Postgres hasn't been provisioned yet, the build still completes
// (with a clear warning) instead of hard-failing. Once DATABASE_URL is configured
// and the project is redeployed, the schema gets pushed automatically.

import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL;

if (!url || url.trim() === "" || url.startsWith("REPLACE_ME")) {
  console.warn(
    "\n⚠️  [vercel-build] DATABASE_URL is not set — skipping `prisma db push`.",
  );
  console.warn(
    "   Pages will deploy but database queries will fail at runtime until you:",
  );
  console.warn(
    "   1) Add a Postgres database (Vercel → Storage → Create → Postgres), or",
  );
  console.warn(
    "      set DATABASE_URL manually in Project Settings → Environment Variables.",
  );
  console.warn("   2) Redeploy.\n");
  process.exit(0);
}

console.log("[vercel-build] Applying Prisma schema via `prisma db push`...");
execSync("prisma db push --skip-generate", { stdio: "inherit" });
