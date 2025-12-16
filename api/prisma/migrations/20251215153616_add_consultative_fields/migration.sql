-- CreateEnum
CREATE TYPE "DealSize" AS ENUM ('SMALL', 'MID', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "dealSize" "DealSize" DEFAULT 'MID',
ADD COLUMN     "decisionMaker" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "nextStep" TEXT;
