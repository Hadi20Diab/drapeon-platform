-- Add Stripe Connect onboarding and payout state to designer profiles.
ALTER TABLE "Designer"
  ADD COLUMN "stripeAccountId" TEXT,
  ADD COLUMN "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeAccountCreatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Designer_stripeAccountId_key" ON "Designer"("stripeAccountId");
CREATE INDEX "Designer_stripeAccountId_idx" ON "Designer"("stripeAccountId");