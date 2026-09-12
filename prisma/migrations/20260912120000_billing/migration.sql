-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "billingStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "overageBilledThrough" TEXT,
ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
