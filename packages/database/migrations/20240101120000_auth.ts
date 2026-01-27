import { type Kysely, sql } from "kysely";
import type { Database } from "../schemas/main";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("username", "text")
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("emailVerified", "boolean", (col) => col.notNull())
    .addColumn("image", "text")
    .addColumn("role", "text")
    .addColumn("communications", "boolean")
    .addColumn("banned", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("banReason", "text")
    .addColumn("banExpires", "timestamp")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  await db.schema
    .createTable("session")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("token", "text", (col) => col.notNull())
    .addColumn("expiresAt", "timestamp", (col) => col.notNull())
    .addColumn("ipAddress", "text")
    .addColumn("userAgent", "text")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  await db.schema
    .createTable("account")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("accountId", "text", (col) => col.notNull())
    .addColumn("providerId", "text", (col) => col.notNull())
    .addColumn("accessToken", "text")
    .addColumn("refreshToken", "text")
    .addColumn("accessTokenExpiresAt", "timestamp")
    .addColumn("refreshTokenExpiresAt", "timestamp")
    .addColumn("scope", "text")
    .addColumn("idToken", "text")
    .addColumn("password", "text")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  await db.schema
    .createTable("verification")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("identifier", "text", (col) => col.notNull())
    .addColumn("value", "text", (col) => col.notNull())
    .addColumn("expiresAt", "timestamp", (col) => col.notNull())
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  await db.schema
    .createTable("audit_log")
    .addColumn("id", "text", (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade").notNull()
    )
    .addColumn("action", "text", (col) => col.notNull())
    .addColumn("resourceType", "text")
    .addColumn("resourceId", "text")
    .addColumn("details", "jsonb")
    .addColumn("ipAddress", "text")
    .addColumn("userAgent", "text")
    .addColumn("sessionId", "text")
    .addColumn("success", "boolean", (col) => col.notNull())
    .addColumn("errorMessage", "text")
    .addColumn("createdAt", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("audit_log").ifExists().execute();
  await db.schema.dropTable("verification").ifExists().execute();
  await db.schema.dropTable("account").ifExists().execute();
  await db.schema.dropTable("session").ifExists().execute();
  await db.schema.dropTable("user").ifExists().execute();
}
