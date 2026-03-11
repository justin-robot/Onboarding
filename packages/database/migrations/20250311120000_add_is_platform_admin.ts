import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add isPlatformAdmin column to user table
  await db.schema
    .alterTable("user")
    .addColumn("isPlatformAdmin", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  // Migrate existing platform admins: set isPlatformAdmin = true for users with role = 'admin'
  await db
    .updateTable("user")
    .set({ isPlatformAdmin: true })
    .where("role", "=", "admin")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("user")
    .dropColumn("isPlatformAdmin")
    .execute();
}
