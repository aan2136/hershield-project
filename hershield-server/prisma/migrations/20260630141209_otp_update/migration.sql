/*
  Warnings:

  - Added the required column `fullName` to the `OTP` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `OTP` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."OTP" ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL;
