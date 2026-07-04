/*
  Warnings:

  - Added the required column `email` to the `EmergencyContact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relation` to the `EmergencyContact` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."EmergencyContact" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "relation" TEXT NOT NULL;
