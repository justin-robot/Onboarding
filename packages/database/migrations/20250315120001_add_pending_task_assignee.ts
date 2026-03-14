import { type Kysely, sql } from "kysely";

/**
 * Migration: Add pending_task_assignee table
 *
 * This enables pre-claim user assignment - assigning tasks to
 * email addresses before user accounts exist. When users sign up
 * and join the workspace, pending assignments are converted to
 * real task assignments.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("pending_task_assignee")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("taskId", "text", (col) =>
      col.notNull().references("task.id").onDelete("cascade")
    )
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("createdBy", "text", (col) =>
      col.notNull().references("user.id")
    )
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Unique constraint: one pending assignment per task+email
  await db.schema
    .createIndex("idx_pending_task_assignee_task_email")
    .on("pending_task_assignee")
    .columns(["taskId", "email"])
    .unique()
    .execute();

  // Index for looking up pending assignments by email (for redemption)
  await db.schema
    .createIndex("idx_pending_task_assignee_email")
    .on("pending_task_assignee")
    .column("email")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("pending_task_assignee").execute();
}
