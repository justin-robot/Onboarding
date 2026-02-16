import { type Kysely, sql } from "kysely";
import type { Database } from "../schemas/main";

export async function up(db: Kysely<Database>): Promise<void> {
  // Moxo Audit Log Entry - separate from auth audit_log
  // Tracks workspace and task events for activity feeds and compliance
  await db.schema
    .createTable("moxo_audit_log_entry")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("set null")
    )
    .addColumn("eventType", "text", (col) => col.notNull())
    .addColumn("actorId", "text", (col) =>
      col.references("user.id").onDelete("set null").notNull()
    )
    .addColumn("metadata", "jsonb")
    .addColumn("source", "text", (col) => col.notNull()) // e.g., "web", "api", "system"
    .addColumn("ipAddress", "text")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    // No updatedAt - audit logs are immutable
    .execute();

  // Index for querying by workspace
  await db.schema
    .createIndex("idx_moxo_audit_log_workspace")
    .on("moxo_audit_log_entry")
    .column("workspaceId")
    .execute();

  // Index for querying by task
  await db.schema
    .createIndex("idx_moxo_audit_log_task")
    .on("moxo_audit_log_entry")
    .column("taskId")
    .execute();

  // Index for querying by event type
  await db.schema
    .createIndex("idx_moxo_audit_log_event_type")
    .on("moxo_audit_log_entry")
    .column("eventType")
    .execute();

  // Index for querying by actor
  await db.schema
    .createIndex("idx_moxo_audit_log_actor")
    .on("moxo_audit_log_entry")
    .column("actorId")
    .execute();

  // Composite index for time-based queries per workspace
  await db.schema
    .createIndex("idx_moxo_audit_log_workspace_created")
    .on("moxo_audit_log_entry")
    .columns(["workspaceId", "createdAt"])
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropIndex("idx_moxo_audit_log_workspace_created").ifExists().execute();
  await db.schema.dropIndex("idx_moxo_audit_log_actor").ifExists().execute();
  await db.schema.dropIndex("idx_moxo_audit_log_event_type").ifExists().execute();
  await db.schema.dropIndex("idx_moxo_audit_log_task").ifExists().execute();
  await db.schema.dropIndex("idx_moxo_audit_log_workspace").ifExists().execute();
  await db.schema.dropTable("moxo_audit_log_entry").ifExists().execute();
}
