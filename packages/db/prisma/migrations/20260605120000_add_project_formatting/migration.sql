-- AlterTable
ALTER TABLE "project" ADD COLUMN "themeKey" TEXT NOT NULL DEFAULT 'novel-classic';
ALTER TABLE "project" ADD COLUMN "formatting" JSONB;
