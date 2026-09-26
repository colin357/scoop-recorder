-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "phonePending" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "callSid" TEXT,
ADD COLUMN     "callKind" TEXT,
ADD COLUMN     "twilioRecordingSid" TEXT,
ADD COLUMN     "phoneContact" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_callSid_key" ON "Meeting"("callSid");
