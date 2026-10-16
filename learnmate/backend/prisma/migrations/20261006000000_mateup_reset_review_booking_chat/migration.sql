-- LearnMate: MateUp connections, password reset, review<->booking link,
-- tutor double-booking guard and chat read-state.
-- Every change is additive; existing rows are preserved.

-- CreateEnum
CREATE TYPE "MateUpStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

-- AlterTable: Review (one review per completed session)
ALTER TABLE "Review" ADD COLUMN "bookingId" TEXT;
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Message (read state)
ALTER TABLE "Message" ADD COLUMN "recipientEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);

-- Backfill: recipient is the other participant of the "a|b" conversation id.
UPDATE "Message"
SET "recipientEmail" = CASE
  WHEN split_part("conversationId", '|', 1) = "fromEmail" THEN split_part("conversationId", '|', 2)
  ELSE split_part("conversationId", '|', 1)
END;

-- Messages that already exist were seen under the old behaviour; don't present them as new unread mail.
UPDATE "Message" SET "readAt" = "createdAt";

CREATE INDEX "Message_recipientEmail_readAt_idx" ON "Message"("recipientEmail", "readAt");

-- Tutor double-booking guard.
-- If legacy data already contains two ACTIVE (Pending/Confirmed) sessions for the same tutor and slot,
-- keep the earliest-created one and cancel the later duplicates (rows are kept, only status changes),
-- otherwise the unique index below could not be created.
UPDATE "Booking" b
SET "status" = 'Cancelled', "updatedAt" = CURRENT_TIMESTAMP
WHERE b."status" IN ('Pending', 'Confirmed')
  AND EXISTS (
    SELECT 1 FROM "Booking" o
    WHERE o."tutorId" = b."tutorId" AND o."date" = b."date" AND o."time" = b."time"
      AND o."status" IN ('Pending', 'Confirmed')
      AND (o."createdAt" < b."createdAt" OR (o."createdAt" = b."createdAt" AND o."id" < b."id"))
  );

-- Partial unique index: Declined / Cancelled / Completed bookings do not block a slot.
CREATE UNIQUE INDEX "Booking_tutor_active_slot_key"
  ON "Booking"("tutorId", "date", "time")
  WHERE "status" IN ('Pending', 'Confirmed');

-- CreateTable: MateUpRequest
CREATE TABLE "MateUpRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "status" "MateUpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MateUpRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MateUpRequest_no_self_check" CHECK ("senderId" <> "receiverId")
);
CREATE UNIQUE INDEX "MateUpRequest_pairKey_key" ON "MateUpRequest"("pairKey");
CREATE INDEX "MateUpRequest_receiverId_status_idx" ON "MateUpRequest"("receiverId", "status");
CREATE INDEX "MateUpRequest_senderId_status_idx" ON "MateUpRequest"("senderId", "status");
ALTER TABLE "MateUpRequest" ADD CONSTRAINT "MateUpRequest_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MateUpRequest" ADD CONSTRAINT "MateUpRequest_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
