import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add attachment and reference columns to message table
  await db.schema
    .alterTable("message")
    .addColumn("attachmentIds", sql`text[]`)
    .execute();

  await db.schema
    .alterTable("message")
    .addColumn("referencedTaskId", "uuid", (col) =>
      col.references("task.id").onDelete("set null")
    )
    .execute();

  await db.schema
    .alterTable("message")
    .addColumn("referencedFileId", "uuid", (col) =>
      col.references("file.id").onDelete("set null")
    )
    .execute();

  // Add indexes for efficient querying
  await db.schema
    .createIndex("idx_message_referenced_task")
    .on("message")
    .column("referencedTaskId")
    .execute();

  await db.schema
    .createIndex("idx_message_workspace_created")
    .on("message")
    .columns(["workspaceId", "createdAt"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("idx_message_workspace_created").execute();
  await db.schema.dropIndex("idx_message_referenced_task").execute();

  await db.schema.alterTable("message").dropColumn("referencedFileId").execute();
  await db.schema.alterTable("message").dropColumn("referencedTaskId").execute();
  await db.schema.alterTable("message").dropColumn("attachmentIds").execute();
}
