import type { Kysely } from "kysely";

/**
 * Migration: Fix workspace_member roles that were seeded with wrong values
 *
 * The seed scripts were inserting 'admin' and 'user' instead of 'manager' and 'member'
 * for workspace member roles. This migration fixes any existing records with those
 * incorrect values.
 *
 * This is similar to migration 20250330120000, but catches any records that were
 * created after that migration ran.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Fix workspace member roles: admin -> manager, user -> member
  await db
    .updateTable("workspace_member")
    .set({ role: "manager" })
    .where("role", "=", "admin")
    .execute();

  await db
    .updateTable("workspace_member")
    .set({ role: "member" })
    .where("role", "=", "user")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // No-op: we don't want to revert to incorrect role values
  // This migration only exists to fix data that was incorrectly seeded
}
