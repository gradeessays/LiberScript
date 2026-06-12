-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- AlterTable: replace the tier-based plan model with a single-tier, interval-based one
ALTER TABLE "subscription" ADD COLUMN "interval" "PlanInterval";
ALTER TABLE "subscription" DROP COLUMN "tier";

-- DropEnum
DROP TYPE "PlanTier";
