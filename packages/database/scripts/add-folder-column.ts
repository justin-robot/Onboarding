import "dotenv/config";
import { sql } from "kysely";
import { createDb } from "../index";

async function addFolderColumn() {
  const dbUrl = process.env.DATABASE_URL_DEV_ADMIN;
  if (!dbUrl) {
    console.error("DATABASE_URL_DEV_ADMIN not set");
    process.exit(1);
  }

  const db = createDb(dbUrl);

  try {
    // Check if column exists
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'file' AND column_name = 'folderId'
    `.execute(db);

    if (result.rows.length > 0) {
      console.log("folderId column already exists");
      return;
    }

    // Add the column
    console.log("Adding folderId column to file table...");
    await sql`
      ALTER TABLE "file"
      ADD COLUMN "folderId" TEXT REFERENCES "file"(id) ON DELETE SET NULL
    `.execute(db);

    console.log("Creating index on folderId...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_file_folder ON "file" ("folderId")
    `.execute(db);

    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

addFolderColumn();
