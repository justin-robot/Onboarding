import { type Kysely, sql } from "kysely";

/**
 * Migration: Add isTemplate field to workspace table
 *
 * This enables workspace templates - reusable workspace structures
 * that can be used to create new workspaces with pre-configured
 * sections, tasks, and configurations.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("workspace")
    .addColumn("isTemplate", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .execute();

  // Create index for efficient template queries
  await db.schema
    .createIndex("idx_workspace_is_template")
    .on("workspace")
    .column("isTemplate")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex("idx_workspace_is_template")
    .execute();

  await db.schema
    .alterTable("workspace")
    .dropColumn("isTemplate")
    .execute();
}
