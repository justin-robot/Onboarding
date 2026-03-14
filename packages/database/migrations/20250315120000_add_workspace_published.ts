import { type Kysely, sql } from "kysely";

/**
 * Migration: Add isPublished field to workspace table
 *
 * This enables draft/published state for workspaces.
 * New workspaces start as unpublished (draft mode) so admins can
 * set them up without triggering notifications.
 * Existing workspaces default to published (already live).
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Add isPublished column with default false (new workspaces start as drafts)
  await db.schema
    .alterTable("workspace")
    .addColumn("isPublished", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .execute();

  // Set existing workspaces to published (they're already live)
  await sql`UPDATE workspace SET "isPublished" = true`.execute(db);

  // Create index for efficient filtering
  await db.schema
    .createIndex("idx_workspace_is_published")
    .on("workspace")
    .column("isPublished")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex("idx_workspace_is_published")
    .execute();

  await db.schema
    .alterTable("workspace")
    .dropColumn("isPublished")
    .execute();
}
