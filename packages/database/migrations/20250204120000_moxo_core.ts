import { type Kysely, sql } from "kysely";
import type { Database } from "../schemas/main";

export async function up(db: Kysely<Database>): Promise<void> {
  // Update user role to include account_manager
  // Note: PostgreSQL doesn't support altering enum values easily with Kysely,
  // so we use text type and handle validation at the application level

  // Workspace - the top-level container
  await db.schema
    .createTable("workspace")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("dueDate", "timestamp")
    .addColumn("deletedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Workspace Member - links users to workspaces with roles
  await db.schema
    .createTable("workspace_member")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("role", "text", (col) => col.notNull()) // admin | account_manager | user
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Unique constraint: one user per workspace
  await db.schema
    .createIndex("workspace_member_unique")
    .on("workspace_member")
    .columns(["workspaceId", "userId"])
    .unique()
    .execute();

  // Section - groups tasks within a workspace
  await db.schema
    .createTable("section")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("deletedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Index for ordering sections within workspace
  await db.schema
    .createIndex("section_workspace_position")
    .on("section")
    .columns(["workspaceId", "position"])
    .execute();

  // Task - the core unit of work
  await db.schema
    .createTable("task")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("sectionId", "text", (col) =>
      col.references("section.id").onDelete("cascade").notNull()
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull()) // FORM | ACKNOWLEDGEMENT | TIME_BOOKING | E_SIGN | FILE_REQUEST | APPROVAL
    .addColumn("status", "text", (col) => col.notNull().defaultTo("not_started")) // not_started | in_progress | completed
    .addColumn("completionRule", "text", (col) => col.notNull().defaultTo("all")) // any | all
    .addColumn("dueDateType", "text") // absolute | relative | null
    .addColumn("dueDateValue", "timestamp") // the actual date (set immediately for absolute, computed for relative)
    .addColumn("deletedAt", "timestamp")
    .addColumn("completedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Index for ordering tasks within section
  await db.schema
    .createIndex("task_section_position")
    .on("task")
    .columns(["sectionId", "position"])
    .execute();

  // Task Dependency - defines unlock and date relationships between tasks
  await db.schema
    .createTable("task_dependency")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull()
    )
    .addColumn("dependsOnTaskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull()
    )
    .addColumn("type", "text", (col) => col.notNull()) // unlock | date_anchor | both
    .addColumn("offsetDays", "integer") // only for date_anchor or both
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Index for looking up dependencies
  await db.schema
    .createIndex("task_dependency_task")
    .on("task_dependency")
    .columns(["taskId"])
    .execute();

  await db.schema
    .createIndex("task_dependency_depends_on")
    .on("task_dependency")
    .columns(["dependsOnTaskId"])
    .execute();

  // Task Assignee - links users to tasks
  await db.schema
    .createTable("task_assignee")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending")) // pending | completed
    .addColumn("completedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Index for looking up assignees
  await db.schema
    .createIndex("task_assignee_task")
    .on("task_assignee")
    .columns(["taskId"])
    .execute();

  await db.schema
    .createIndex("task_assignee_user")
    .on("task_assignee")
    .columns(["userId"])
    .execute();

  // Comment - comments on tasks
  await db.schema
    .createTable("comment")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("deletedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Message - workspace chat messages
  await db.schema
    .createTable("message")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull().defaultTo("text")) // text | annotation | system
    .addColumn("deletedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // File - uploaded files
  await db.schema
    .createTable("file")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("uploadedBy", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("mimeType", "text", (col) => col.notNull())
    .addColumn("size", "integer", (col) => col.notNull())
    .addColumn("storageKey", "text", (col) => col.notNull()) // S3 key
    .addColumn("thumbnailKey", "text") // S3 key for thumbnail
    .addColumn("sourceType", "text", (col) => col.notNull()) // upload | task_attachment | chat
    .addColumn("sourceTaskId", "text", (col) => col.references("task.id").onDelete("set null"))
    .addColumn("deletedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Notification - user notifications
  await db.schema
    .createTable("notification")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body", "text")
    .addColumn("data", "jsonb") // additional data like taskId, etc.
    .addColumn("read", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("readAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Index for querying user's unread notifications
  await db.schema
    .createIndex("notification_user_read")
    .on("notification")
    .columns(["userId", "read"])
    .execute();

  // Reminder - scheduled reminders
  await db.schema
    .createTable("reminder")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("taskId", "text", (col) => col.references("task.id").onDelete("cascade"))
    .addColumn("type", "text", (col) => col.notNull()) // before_due | after_due | recurring
    .addColumn("offsetMinutes", "integer", (col) => col.notNull())
    .addColumn("enabled", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("lastSentAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Pending invitations - for invitation-based signup
  await db.schema
    .createTable("pending_invitation")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("workspaceId", "text", (col) =>
      col.references("workspace.id").onDelete("cascade").notNull()
    )
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("role", "text", (col) => col.notNull()) // admin | account_manager | user
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "timestamp", (col) => col.notNull())
    .addColumn("invitedBy", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("pending_invitation").ifExists().execute();
  await db.schema.dropTable("reminder").ifExists().execute();
  await db.schema.dropTable("notification").ifExists().execute();
  await db.schema.dropTable("file").ifExists().execute();
  await db.schema.dropTable("message").ifExists().execute();
  await db.schema.dropTable("comment").ifExists().execute();
  await db.schema.dropTable("task_assignee").ifExists().execute();
  await db.schema.dropTable("task_dependency").ifExists().execute();
  await db.schema.dropTable("task").ifExists().execute();
  await db.schema.dropTable("section").ifExists().execute();
  await db.schema.dropTable("workspace_member").ifExists().execute();
  await db.schema.dropTable("workspace").ifExists().execute();
}
