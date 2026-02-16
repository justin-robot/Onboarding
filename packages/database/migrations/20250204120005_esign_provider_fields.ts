import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Create enum type for e-sign status (expanded)
  await sql`
    DO $$ BEGIN
      ALTER TYPE esign_status ADD VALUE IF NOT EXISTS 'sent';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TYPE esign_status ADD VALUE IF NOT EXISTS 'viewed';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TYPE esign_status ADD VALUE IF NOT EXISTS 'signed';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TYPE esign_status ADD VALUE IF NOT EXISTS 'declined';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TYPE esign_status ADD VALUE IF NOT EXISTS 'cancelled';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);

  // Create e-sign provider enum
  await sql`
    DO $$ BEGIN
      CREATE TYPE esign_provider AS ENUM ('signnow');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);

  // Add new columns to esign_config
  await db.schema
    .alterTable("esign_config")
    .addColumn("fileId", "text", (col) =>
      col.references("file.id").onDelete("cascade")
    )
    .execute();

  await db.schema
    .alterTable("esign_config")
    .addColumn("signerEmail", "varchar(255)")
    .execute();

  await db.schema
    .alterTable("esign_config")
    .addColumn("provider", sql`esign_provider`, (col) =>
      col.defaultTo("signnow")
    )
    .execute();

  // Make providerDocumentId and providerSigningUrl nullable
  // (they're set after push, not at creation time)
  await db.schema
    .alterTable("esign_config")
    .alterColumn("providerDocumentId", (col) => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable("esign_config")
    .alterColumn("providerSigningUrl", (col) => col.dropNotNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Make columns not null again
  await db.schema
    .alterTable("esign_config")
    .alterColumn("providerSigningUrl", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("esign_config")
    .alterColumn("providerDocumentId", (col) => col.setNotNull())
    .execute();

  // Drop new columns
  await db.schema.alterTable("esign_config").dropColumn("provider").execute();
  await db.schema.alterTable("esign_config").dropColumn("signerEmail").execute();
  await db.schema.alterTable("esign_config").dropColumn("fileId").execute();

  // Drop provider enum
  await sql`DROP TYPE IF EXISTS esign_provider`.execute(db);

  // Note: Can't easily remove enum values in PostgreSQL
}
