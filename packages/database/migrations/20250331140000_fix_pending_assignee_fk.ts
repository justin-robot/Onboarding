import { type Kysely, sql } from "kysely";

/**
 * Migration: Fix pending_task_assignee.createdBy foreign key
 *
 * The createdBy column was missing ON DELETE SET NULL, which caused
 * foreign key constraint errors when trying to delete users who had
 * created pending task assignments.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Drop the existing foreign key constraint and add one with SET NULL
  await sql`
    ALTER TABLE pending_task_assignee
    DROP CONSTRAINT IF EXISTS pending_task_assignee_createdBy_fkey
  `.execute(db);

  await sql`
    ALTER TABLE pending_task_assignee
    ALTER COLUMN "createdBy" DROP NOT NULL
  `.execute(db);

  await sql`
    ALTER TABLE pending_task_assignee
    ADD CONSTRAINT pending_task_assignee_createdBy_fkey
    FOREIGN KEY ("createdBy") REFERENCES "user"(id) ON DELETE SET NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert to the original constraint (without ON DELETE)
  await sql`
    ALTER TABLE pending_task_assignee
    DROP CONSTRAINT IF EXISTS pending_task_assignee_createdBy_fkey
  `.execute(db);

  await sql`
    ALTER TABLE pending_task_assignee
    ALTER COLUMN "createdBy" SET NOT NULL
  `.execute(db);

  await sql`
    ALTER TABLE pending_task_assignee
    ADD CONSTRAINT pending_task_assignee_createdBy_fkey
    FOREIGN KEY ("createdBy") REFERENCES "user"(id)
  `.execute(db);
}
