-- CreateEnum
CREATE TYPE "LiftRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LiftAccessStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "LiftPinStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'USED');

-- CreateEnum
CREATE TYPE "LiftDocumentType" AS ENUM ('MEDICAL', 'SUPPORTING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'PIN_GENERATED', 'FINGERPRINT_ENROLLED', 'LIFT_EXPIRED', 'LIFT_REVOKED');

-- CreateTable
CREATE TABLE "lift_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "medicalCondition" TEXT,
    "documentType" "LiftDocumentType",
    "documentPath" TEXT,
    "status" "LiftRequestStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lift_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lift_access" (
    "id" TEXT NOT NULL,
    "liftRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "LiftAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lift_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lift_pins" (
    "id" TEXT NOT NULL,
    "liftAccessId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "status" "LiftPinStatus" NOT NULL DEFAULT 'ACTIVE',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "lift_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fingerprint_enrollments" (
    "id" TEXT NOT NULL,
    "liftAccessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrolled" BOOLEAN NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP(3),
    "deviceId" TEXT,

    CONSTRAINT "fingerprint_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "relatedLiftRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lift_requests_userId_idx" ON "lift_requests"("userId");

-- CreateIndex
CREATE INDEX "lift_requests_status_idx" ON "lift_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lift_access_liftRequestId_key" ON "lift_access"("liftRequestId");

-- CreateIndex
CREATE INDEX "lift_access_userId_idx" ON "lift_access"("userId");

-- CreateIndex
CREATE INDEX "lift_access_status_idx" ON "lift_access"("status");

-- CreateIndex
CREATE INDEX "lift_pins_liftAccessId_idx" ON "lift_pins"("liftAccessId");

-- CreateIndex
CREATE INDEX "lift_pins_status_idx" ON "lift_pins"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fingerprint_enrollments_liftAccessId_key" ON "fingerprint_enrollments"("liftAccessId");

-- CreateIndex
CREATE INDEX "fingerprint_enrollments_userId_idx" ON "fingerprint_enrollments"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- AddForeignKey
ALTER TABLE "lift_requests" ADD CONSTRAINT "lift_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_requests" ADD CONSTRAINT "lift_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_access" ADD CONSTRAINT "lift_access_liftRequestId_fkey" FOREIGN KEY ("liftRequestId") REFERENCES "lift_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_access" ADD CONSTRAINT "lift_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_access" ADD CONSTRAINT "lift_access_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_pins" ADD CONSTRAINT "lift_pins_liftAccessId_fkey" FOREIGN KEY ("liftAccessId") REFERENCES "lift_access"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fingerprint_enrollments" ADD CONSTRAINT "fingerprint_enrollments_liftAccessId_fkey" FOREIGN KEY ("liftAccessId") REFERENCES "lift_access"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fingerprint_enrollments" ADD CONSTRAINT "fingerprint_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
