import { Kysely, sql } from "kysely";

/**
 * Change file.uploadedBy foreign key constraint from CASCADE to SET NULL
 *
 * This ensures that when a user is deleted, their uploaded files are preserved
 * rather than being deleted along with the user.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Drop the existing foreign key constraint
  await sql`
    ALTER TABLE "file"
    DROP CONSTRAINT IF EXISTS "file_uploadedBy_fkey"
  `.execute(db);

  // Add new constraint with SET NULL
  await sql`
    ALTER TABLE "file"
    ADD CONSTRAINT "file_uploadedBy_fkey"
    FOREIGN KEY ("uploadedBy")
    REFERENCES "user"("id")
    ON DELETE SET NULL
  `.execute(db);

  // Make the column nullable if it isn't already
  await sql`
    ALTER TABLE "file"
    ALTER COLUMN "uploadedBy" DROP NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Restore the original CASCADE constraint
  await sql`
    ALTER TABLE "file"
    DROP CONSTRAINT IF EXISTS "file_uploadedBy_fkey"
  `.execute(db);

  await sql`
    ALTER TABLE "file"
    ADD CONSTRAINT "file_uploadedBy_fkey"
    FOREIGN KEY ("uploadedBy")
    REFERENCES "user"("id")
    ON DELETE CASCADE
  `.execute(db);
}
