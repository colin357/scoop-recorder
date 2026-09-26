-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "suggestedProjectName" TEXT,
ADD COLUMN     "suggestedProjectDescription" TEXT;
