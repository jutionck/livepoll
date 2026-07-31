-- CreateTable
CREATE TABLE "sessions" (
    "code" VARCHAR(10) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "active_question_id" VARCHAR(50),
    "active_question_activated_at" INTEGER,
    "host_token_hash" VARCHAR(255) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "session_code" VARCHAR(10) NOT NULL,
    "q_id" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "timer" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "session_code" VARCHAR(10) NOT NULL,
    "question_id" VARCHAR(50) NOT NULL,
    "participant_id" VARCHAR(100) NOT NULL,
    "vote" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_session_code_q_id_key" ON "questions"("session_code", "q_id");

-- CreateIndex
CREATE INDEX "votes_session_code_question_id_idx" ON "votes"("session_code", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_session_code_question_id_participant_id_key" ON "votes"("session_code", "question_id", "participant_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_session_code_fkey" FOREIGN KEY ("session_code") REFERENCES "sessions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_session_code_fkey" FOREIGN KEY ("session_code") REFERENCES "sessions"("code") ON DELETE CASCADE ON UPDATE CASCADE;
