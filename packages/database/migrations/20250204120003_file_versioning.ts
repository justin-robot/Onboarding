import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add previousVersionId column to file table for versioning support
  await db.schema
    .alterTable("file")
    .addColumn("previousVersionId", "uuid", (col) =>
      col.references("file.id").onDelete("set null")
    )
    .execute();

  // Add index for efficient version history queries
  await db.schema
    .createIndex("idx_file_previous_version")
    .on("file")
    .column("previousVersionId")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("idx_file_previous_version")
    .execute();

  await db.schema
    .alterTable("file")
    .dropColumn("previousVersionId")
    .execute();
}
