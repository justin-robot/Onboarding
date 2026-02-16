import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Create integration provider enum
  await sql`
    DO $$ BEGIN
      CREATE TYPE integration_provider AS ENUM ('google_calendar');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);

  // Create workspace_integration table
  await db.schema
    .createTable("workspace_integration")
    .addColumn("id", "text", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("workspaceId", "text", (col) =>
      col.notNull().references("workspace.id").onDelete("cascade")
    )
    .addColumn("provider", sql`integration_provider`, (col) => col.notNull())
    .addColumn("accessToken", "text") // Encrypted
    .addColumn("refreshToken", "text") // Encrypted
    .addColumn("tokenExpiresAt", "timestamptz")
    .addColumn("scope", "text")
    .addColumn("connectedBy", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade")
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Create unique index on workspace + provider
  await db.schema
    .createIndex("idx_workspace_integration_workspace_provider")
    .on("workspace_integration")
    .columns(["workspaceId", "provider"])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("idx_workspace_integration_workspace_provider")
    .execute();
  await db.schema.dropTable("workspace_integration").execute();
  await sql`DROP TYPE IF EXISTS integration_provider`.execute(db);
}
