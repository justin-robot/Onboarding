import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add folderId column to file table for folder hierarchy support
  await db.schema
    .alterTable("file")
    .addColumn("folderId", "text", (col) =>
      col.references("file.id").onDelete("set null")
    )
    .execute();

  // Add index for efficient folder content queries
  await db.schema
    .createIndex("idx_file_folder")
    .on("file")
    .column("folderId")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("file")
    .dropColumn("folderId")
    .execute();
}
