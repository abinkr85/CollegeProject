-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "student_id_number" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_front_url" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_back_url" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_status" VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_scanned_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_rejection_reason" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_users_id_card_status" ON "users"("id_card_status");
CREATE INDEX IF NOT EXISTS "idx_users_student_id_number" ON "users"("student_id_number");
