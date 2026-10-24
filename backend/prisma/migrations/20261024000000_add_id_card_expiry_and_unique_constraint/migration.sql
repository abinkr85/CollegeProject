-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(30);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_valid_upto" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_card_expires_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_phone" VARCHAR(30);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_student_id_number_unique" ON "users"("student_id_number") WHERE "student_id_number" IS NOT NULL;
