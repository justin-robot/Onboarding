import { type Kysely, sql } from "kysely";
import type { Database } from "../schemas/main";

export async function up(db: Kysely<Database>): Promise<void> {
  // =====================
  // FORM TASK TABLES
  // =====================

  // Form Config - settings for a form task
  await db.schema
    .createTable("form_config")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull().unique()
    )
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Form Page - pages within a form
  await db.schema
    .createTable("form_page")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("formConfigId", "text", (col) =>
      col.references("form_config.id").onDelete("cascade").notNull()
    )
    .addColumn("title", "text")
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Form Element - individual form fields
  await db.schema
    .createTable("form_element")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("formPageId", "text", (col) =>
      col.references("form_page.id").onDelete("cascade").notNull()
    )
    .addColumn("type", "text", (col) => col.notNull()) // text | textarea | select | radio | checkbox | file | date | number | email | phone
    .addColumn("label", "text", (col) => col.notNull())
    .addColumn("placeholder", "text")
    .addColumn("helpText", "text")
    .addColumn("required", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("options", "jsonb") // for select, radio, checkbox - array of {value, label}
    .addColumn("validation", "jsonb") // validation rules matching react-hook-form
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Form Submission - a user's submission of a form
  await db.schema
    .createTable("form_submission")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("formConfigId", "text", (col) =>
      col.references("form_config.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("draft")) // draft | submitted
    .addColumn("submittedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Form Field Response - individual field values in a submission
  await db.schema
    .createTable("form_field_response")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("submissionId", "text", (col) =>
      col.references("form_submission.id").onDelete("cascade").notNull()
    )
    .addColumn("elementId", "text", (col) =>
      col.references("form_element.id").onDelete("cascade").notNull()
    )
    .addColumn("value", "jsonb") // string | string[] | file_id depending on element type
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // =====================
  // ACKNOWLEDGEMENT TASK TABLES
  // =====================

  // Acknowledgement Config - settings for an acknowledgement task
  await db.schema
    .createTable("acknowledgement_config")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull().unique()
    )
    .addColumn("instructions", "text")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Acknowledgement - a user's acknowledgement
  await db.schema
    .createTable("acknowledgement")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("configId", "text", (col) =>
      col.references("acknowledgement_config.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending")) // pending | acknowledged
    .addColumn("acknowledgedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // =====================
  // TIME BOOKING TASK TABLES
  // =====================

  // Time Booking Config - settings for a time booking task
  await db.schema
    .createTable("time_booking_config")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull().unique()
    )
    .addColumn("bookingLink", "text", (col) => col.notNull()) // URL to external scheduling tool
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Booking - a user's booking
  await db.schema
    .createTable("booking")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("configId", "text", (col) =>
      col.references("time_booking_config.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("not_started")) // not_started | booked
    .addColumn("calendarEventId", "text")
    .addColumn("meetLink", "text")
    .addColumn("bookedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // =====================
  // E-SIGN TASK TABLES
  // =====================

  // E-Sign Config - settings for an e-signature task
  await db.schema
    .createTable("esign_config")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull().unique()
    )
    .addColumn("providerDocumentId", "text", (col) => col.notNull())
    .addColumn("providerSigningUrl", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending")) // pending | completed
    .addColumn("completedDocumentUrl", "text")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // =====================
  // FILE REQUEST TASK TABLES
  // =====================

  // File Request Config - settings for a file request task
  await db.schema
    .createTable("file_request_config")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull().unique()
    )
    .addColumn("targetFolderId", "text") // optional folder to organize uploads
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // =====================
  // APPROVAL TASK TABLES
  // =====================

  // Approval Config - settings for an approval task
  await db.schema
    .createTable("approval_config")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("taskId", "text", (col) =>
      col.references("task.id").onDelete("cascade").notNull().unique()
    )
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  // Approver - users who can approve
  await db.schema
    .createTable("approver")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("configId", "text", (col) =>
      col.references("approval_config.id").onDelete("cascade").notNull()
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending")) // pending | approved | rejected
    .addColumn("decidedAt", "timestamp")
    .addColumn("comments", "text")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  // Approval
  await db.schema.dropTable("approver").ifExists().execute();
  await db.schema.dropTable("approval_config").ifExists().execute();

  // File Request
  await db.schema.dropTable("file_request_config").ifExists().execute();

  // E-Sign
  await db.schema.dropTable("esign_config").ifExists().execute();

  // Time Booking
  await db.schema.dropTable("booking").ifExists().execute();
  await db.schema.dropTable("time_booking_config").ifExists().execute();

  // Acknowledgement
  await db.schema.dropTable("acknowledgement").ifExists().execute();
  await db.schema.dropTable("acknowledgement_config").ifExists().execute();

  // Form
  await db.schema.dropTable("form_field_response").ifExists().execute();
  await db.schema.dropTable("form_submission").ifExists().execute();
  await db.schema.dropTable("form_element").ifExists().execute();
  await db.schema.dropTable("form_page").ifExists().execute();
  await db.schema.dropTable("form_config").ifExists().execute();
}
