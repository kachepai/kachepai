CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "name" TEXT,
  "mobile" TEXT,
  "email" TEXT,
  "passwordHash" TEXT,
  "otpHash" TEXT,
  "otpExpiresAt" TIMESTAMP(3),
  "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
