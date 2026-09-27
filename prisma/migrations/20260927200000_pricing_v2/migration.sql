-- Pricing v2: one per-person plan, a no-card trial, and a phone-calls add-on.
ALTER TABLE "Organization" ADD COLUMN "phoneAddonItemId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "phoneAddonSince" TIMESTAMP(3);
