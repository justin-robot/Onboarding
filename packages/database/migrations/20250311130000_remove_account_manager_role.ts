import { type Kysely } from "kysely";

/**
 * Migration: Remove account_manager role
 *
 * This migration converts all existing account_manager roles to "user"
 * as part of simplifying the role system to just admin and user.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Convert all account_manager roles to user in workspace_member
  await db
    .updateTable("workspace_member")
    .set({ role: "user" })
    .where("role", "=", "account_manager")
    .execute();

  // Convert all account_manager roles to user in pending_invitation
  await db
    .updateTable("pending_invitation")
    .set({ role: "user" })
    .where("role", "=", "account_manager")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // No rollback - we can't know which users were previously account_managers
  console.log("Note: Cannot rollback account_manager role removal - data has been converted to user role");
}
