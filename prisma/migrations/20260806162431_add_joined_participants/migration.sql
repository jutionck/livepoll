-- CreateTable
CREATE TABLE "joined_participants" (
    "id" UUID NOT NULL,
    "session_code" VARCHAR(10) NOT NULL,
    "participant_id" VARCHAR(100) NOT NULL,
    "participant_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "joined_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "joined_participants_session_code_participant_id_key" ON "joined_participants"("session_code", "participant_id");

-- AddForeignKey
ALTER TABLE "joined_participants" ADD CONSTRAINT "joined_participants_session_code_fkey" FOREIGN KEY ("session_code") REFERENCES "sessions"("code") ON DELETE CASCADE ON UPDATE CASCADE;
