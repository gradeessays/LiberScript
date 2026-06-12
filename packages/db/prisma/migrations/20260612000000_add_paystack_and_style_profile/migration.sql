-- DropIndex
DROP INDEX "subscription_stripeCustomerId_key";

-- DropIndex
DROP INDEX "subscription_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "styleProfileId" TEXT;

-- AlterTable
ALTER TABLE "subscription" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "paystackCustomerCode" TEXT,
ADD COLUMN     "paystackEmailToken" TEXT,
ADD COLUMN     "paystackPlanCode" TEXT,
ADD COLUMN     "paystackSubscriptionCode" TEXT;

-- CreateTable
CREATE TABLE "style_profile" (
    "id" TEXT NOT NULL,
    "ownerType" "OwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "style_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "style_profile_ownerType_ownerId_idx" ON "style_profile"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "project_styleProfileId_idx" ON "project"("styleProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_paystackCustomerCode_key" ON "subscription"("paystackCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_paystackSubscriptionCode_key" ON "subscription"("paystackSubscriptionCode");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_styleProfileId_fkey" FOREIGN KEY ("styleProfileId") REFERENCES "style_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "style_profile" ADD CONSTRAINT "style_profile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
