-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "batch" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "year" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "joining_date" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_delete_students" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_users_is_blocked" ON "users"("is_blocked");
CREATE INDEX IF NOT EXISTS "idx_users_employee_id" ON "users"("employee_id");
