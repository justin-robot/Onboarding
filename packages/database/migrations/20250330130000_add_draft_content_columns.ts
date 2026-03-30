import { type Kysely, sql } from "kysely";

/**
 * Migration: Add draft content visibility columns
 *
 * - hasBeenPublished on workspace: tracks if workspace was ever published
 * - isDraft on task: marks tasks created while workspace is in draft mode
 *
 * Tasks created in draft mode (after workspace was previously published)
 * are hidden from regular members until workspace is published again.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Add hasBeenPublished to workspace table
  await db.schema
    .alterTable("workspace")
    .addColumn("hasBeenPublished", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .execute();

  // Set hasBeenPublished = true for workspaces that are already published
  await sql`UPDATE workspace SET "hasBeenPublished" = true WHERE "isPublished" = true`.execute(db);

  // Add isDraft to task table
  await db.schema
    .alterTable("task")
    .addColumn("isDraft", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .execute();

  // Create index for efficient filtering of draft tasks
  await db.schema
    .createIndex("idx_task_is_draft")
    .on("task")
    .column("isDraft")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex("idx_task_is_draft")
    .execute();

  await db.schema
    .alterTable("task")
    .dropColumn("isDraft")
    .execute();

  await db.schema
    .alterTable("workspace")
    .dropColumn("hasBeenPublished")
    .execute();
}
