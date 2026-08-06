-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "correct_answer" JSONB;

-- AlterTable
ALTER TABLE "votes" ADD COLUMN     "participant_name" VARCHAR(100);
