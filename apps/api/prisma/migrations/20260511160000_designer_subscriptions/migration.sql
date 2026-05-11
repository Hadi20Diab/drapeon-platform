-- Introduce designer subscription billing as the primary monetization model.
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "DesignerSubscriptionStatus" AS ENUM (
  'INACTIVE',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED'
);

CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "stripePriceId" TEXT NOT NULL,
  "stripeProductId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTH',
  "amount" DECIMAL(10,2) NOT NULL,
  "productLimit" INTEGER NOT NULL,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DesignerSubscription" (
  "id" TEXT NOT NULL,
  "designerId" TEXT NOT NULL,
  "planId" TEXT,
  "status" "DesignerSubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "productLimitSnapshot" INTEGER,
  "productsPublishedThisPeriod" INTEGER NOT NULL DEFAULT 0,
  "usagePeriodStart" TIMESTAMP(3),
  "usagePeriodEnd" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "subscribedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "lastCheckoutAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesignerSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");
CREATE UNIQUE INDEX "SubscriptionPlan_stripePriceId_key" ON "SubscriptionPlan"("stripePriceId");
CREATE INDEX "SubscriptionPlan_isActive_sortOrder_idx" ON "SubscriptionPlan"("isActive", "sortOrder");

CREATE UNIQUE INDEX "DesignerSubscription_designerId_key" ON "DesignerSubscription"("designerId");
CREATE UNIQUE INDEX "DesignerSubscription_stripeCustomerId_key" ON "DesignerSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX "DesignerSubscription_stripeSubscriptionId_key" ON "DesignerSubscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "DesignerSubscription_stripeCheckoutSessionId_key" ON "DesignerSubscription"("stripeCheckoutSessionId");
CREATE INDEX "DesignerSubscription_status_currentPeriodEnd_idx" ON "DesignerSubscription"("status", "currentPeriodEnd");
CREATE INDEX "DesignerSubscription_planId_idx" ON "DesignerSubscription"("planId");

ALTER TABLE "DesignerSubscription"
ADD CONSTRAINT "DesignerSubscription_designerId_fkey"
FOREIGN KEY ("designerId") REFERENCES "Designer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DesignerSubscription"
ADD CONSTRAINT "DesignerSubscription_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
