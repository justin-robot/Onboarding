import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Rename workspace member roles: admin -> manager, user -> member
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

  // Rename pending invitation roles: admin -> manager, user -> member
  await db
    .updateTable("pending_invitation")
    .set({ role: "manager" })
    .where("role", "=", "admin")
    .execute();

  await db
    .updateTable("pending_invitation")
    .set({ role: "member" })
    .where("role", "=", "user")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert workspace member roles: manager -> admin, member -> user
  await db
    .updateTable("workspace_member")
    .set({ role: "admin" })
    .where("role", "=", "manager")
    .execute();

  await db
    .updateTable("workspace_member")
    .set({ role: "user" })
    .where("role", "=", "member")
    .execute();

  // Revert pending invitation roles: manager -> admin, member -> user
  await db
    .updateTable("pending_invitation")
    .set({ role: "admin" })
    .where("role", "=", "manager")
    .execute();

  await db
    .updateTable("pending_invitation")
    .set({ role: "user" })
    .where("role", "=", "member")
    .execute();
}
