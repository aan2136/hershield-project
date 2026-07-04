/*
  Warnings:

  - A unique constraint covering the columns `[mobile]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."OTP" ADD COLUMN     "mobile" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "mobile" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "public"."User"("mobile");
