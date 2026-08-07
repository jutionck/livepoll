-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "host_account_id" UUID;

-- CreateTable
CREATE TABLE "host_accounts" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "auth_token_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "host_accounts_email_key" ON "host_accounts"("email");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_host_account_id_fkey" FOREIGN KEY ("host_account_id") REFERENCES "host_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
