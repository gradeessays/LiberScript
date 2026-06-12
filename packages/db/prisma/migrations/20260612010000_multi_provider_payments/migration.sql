-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'PAYSTACK');

-- AlterTable: add generic provider columns
ALTER TABLE "subscription" ADD COLUMN     "provider" "PaymentProvider",
ADD COLUMN     "providerCustomerId" TEXT,
ADD COLUMN     "providerSubscriptionId" TEXT,
ADD COLUMN     "providerPlanId" TEXT,
ADD COLUMN     "providerData" JSONB;

-- Backfill existing Paystack rows into the generic columns
UPDATE "subscription" SET
  "provider" = 'PAYSTACK',
  "providerCustomerId" = "paystackCustomerCode",
  "providerSubscriptionId" = "paystackSubscriptionCode",
  "providerPlanId" = "paystackPlanCode",
  "providerData" = jsonb_build_object('emailToken', "paystackEmailToken")
WHERE "paystackCustomerCode" IS NOT NULL OR "paystackSubscriptionCode" IS NOT NULL;

-- DropIndex
DROP INDEX "subscription_paystackCustomerCode_key";

-- DropIndex
DROP INDEX "subscription_paystackSubscriptionCode_key";

-- AlterTable: drop the now-superseded Paystack-specific columns
ALTER TABLE "subscription" DROP COLUMN "paystackCustomerCode",
DROP COLUMN "paystackEmailToken",
DROP COLUMN "paystackPlanCode",
DROP COLUMN "paystackSubscriptionCode";

-- CreateTable
CREATE TABLE "payment_provider_config" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "ciphertext" TEXT,
    "iv" TEXT,
    "authTag" TEXT,
    "config" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_config_provider_key" ON "payment_provider_config"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_provider_providerCustomerId_key" ON "subscription"("provider", "providerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_provider_providerSubscriptionId_key" ON "subscription"("provider", "providerSubscriptionId");
