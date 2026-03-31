import { type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add sourceTemplateId column to track which template a workspace was created from
  await db.schema
    .alterTable("workspace")
    .addColumn("sourceTemplateId", "text", (col) =>
      col.references("workspace.id").onDelete("set null")
    )
    .execute();

  // Create index for efficient queries of workspaces by template
  await db.schema
    .createIndex("idx_workspace_source_template")
    .on("workspace")
    .column("sourceTemplateId")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("idx_workspace_source_template").execute();

  await db.schema
    .alterTable("workspace")
    .dropColumn("sourceTemplateId")
    .execute();
}
