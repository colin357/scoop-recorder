-- CreateTable
CREATE TABLE "MeetingCommitment" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "sourceTimestampSec" INTEGER,
    "sourceQuote" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingCommitment_taskId_key" ON "MeetingCommitment"("taskId");

-- AddForeignKey
ALTER TABLE "MeetingCommitment" ADD CONSTRAINT "MeetingCommitment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingCommitment" ADD CONSTRAINT "MeetingCommitment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
