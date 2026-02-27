import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add replyToMessageId column to message table for quote/reply feature
  // Note: Uses 'text' type to match message.id column type
  await db.schema
    .alterTable("message")
    .addColumn("replyToMessageId", "text", (col) =>
      col.references("message.id").onDelete("set null")
    )
    .execute();

  // Add index for efficient querying of replies
  await db.schema
    .createIndex("idx_message_reply_to")
    .on("message")
    .column("replyToMessageId")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("idx_message_reply_to").execute();
  await db.schema.alterTable("message").dropColumn("replyToMessageId").execute();
}
