import { type Kysely, FileMigrationProvider, Migrator } from "kysely";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { Database } from "../schemas/main";

/**
 * Creates a migrator instance using Kysely's official FileMigrationProvider
 */
function createMigrator(db: Kysely<Database>, migrationsDir: string): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path: { join },
      migrationFolder: migrationsDir,
    }),
  });
}

/**
 * Runs pending migrations
 */
export async function runMigrations(
  db: Kysely<Database>,
  migrationsDir: string,
  options: {
    dryRun?: boolean;
    to?: string; // Run up to and including this migration
    only?: string; // Run only this specific migration (deprecated, use migrations array)
    migrations?: string[]; // Run specific migrations by name
  } = {}
): Promise<void> {
  const migrator = createMigrator(db, migrationsDir);

  if (options.migrations && options.migrations.length > 0) {
    // Custom: Run specific migrations by name (array feature)
    // Get all available migrations from the provider
    const provider = new FileMigrationProvider({
      fs,
      path: { join },
      migrationFolder: migrationsDir,
    });
    const allMigrations = await provider.getMigrations();
    const allMigrationNames = Object.keys(allMigrations);

    const requestedNames = new Set(options.migrations);

    // Validate all requested migrations exist
    const missing = options.migrations.filter(
      (name) => !allMigrationNames.includes(name)
    );
    if (missing.length > 0) {
      throw new Error(
        `Migration(s) not found: ${missing.join(", ")}. Available migrations: ${allMigrationNames.join(", ")}`
      );
    }

    // Check which are already applied
    const appliedMigrations = await migrator.getMigrations();
    const appliedNames = new Set(appliedMigrations.map((m) => m.name));
    const alreadyApplied = options.migrations.filter((name) =>
      appliedNames.has(name)
    );
    if (alreadyApplied.length > 0) {
      throw new Error(
        `Migration(s) already applied: ${alreadyApplied.join(", ")}`
      );
    }

    // Sort requested migrations by name (which includes timestamp) to maintain order
    const sortedRequested = [...options.migrations].sort((a, b) =>
      a.localeCompare(b)
    );

    console.log(`Found ${sortedRequested.length} migration(s) to apply:`);
    for (const name of sortedRequested) {
      console.log(`  - ${name}`);
    }

    if (options.dryRun) {
      console.log("\n[DRY RUN] Would apply migrations above");
      return;
    }

    console.log("\nApplying migrations...");

    // Run each requested migration individually using migrateTo
    for (const name of sortedRequested) {
      try {
        console.log(`  → Running ${name}...`);
        const { error: migrateError } = await migrator.migrateTo(name);
        if (migrateError) {
          throw migrateError;
        }
        console.log(`  ✓ ${name} applied`);
      } catch (error) {
        console.error(`  ✗ ${name} failed:`, error);
        throw error;
      }
    }

    console.log("\n✓ All migrations applied successfully");
  } else if (options.only) {
    // Run only a specific migration (deprecated, use migrations array)
    console.log(`Running migration: ${options.only}...`);
    if (options.dryRun) {
      console.log("[DRY RUN] Would run migration above");
      return;
    }

    const { error } = await migrator.migrateTo(options.only);
    if (error) {
      console.error("✗ Migration failed:", error);
      throw error;
    }
    console.log("✓ Migration completed successfully");
  } else if (options.to) {
    // Run all pending migrations up to and including the specified one
    console.log(`Running migrations up to: ${options.to}...`);
    if (options.dryRun) {
      console.log("[DRY RUN] Would run migrations up to above");
      return;
    }

    const { error } = await migrator.migrateTo(options.to);
    if (error) {
      console.error("✗ Migration failed:", error);
      throw error;
    }
    console.log("✓ Migrations completed successfully");
  } else {
    // Run all pending migrations (default behavior)
    console.log("Running all pending migrations...");
    if (options.dryRun) {
      console.log("[DRY RUN] Would run all pending migrations");
      return;
    }

    const { error, results } = await migrator.migrateToLatest();

    if (error) {
      console.error("✗ Migration failed:", error);
      throw error;
    }

    if (results && results.length > 0) {
      console.log("\nApplied migrations:");
      for (const result of results) {
        if (result.status === "Success") {
          console.log(`  ✓ ${result.migrationName}`);
        } else if (result.status === "Error") {
          console.error(`  ✗ ${result.migrationName}`);
        }
      }
    } else {
      console.log("✓ No pending migrations");
    }
  }
}

/**
 * Rolls back migrations
 */
export async function rollbackMigrations(
  db: Kysely<Database>,
  migrationsDir: string,
  options: {
    count?: number;
    all?: boolean;
    to?: string; // Rollback all migrations down to (but not including) this one
    migrations?: string[]; // Rollback specific migrations by name
    dryRun?: boolean;
  } = {}
): Promise<void> {
  const migrator = createMigrator(db, migrationsDir);

  if (options.migrations && options.migrations.length > 0) {
    // Custom: Rollback specific migrations by name (array feature)
    // Get all migrations to understand the order
    const provider = new FileMigrationProvider({
      fs,
      path: { join },
      migrationFolder: migrationsDir,
    });
    const allMigrations = await provider.getMigrations();
    const allMigrationNames = Object.keys(allMigrations).sort();

    const appliedMigrations = await migrator.getMigrations();
    const requestedNames = new Set(options.migrations);

    // Validate all requested migrations exist and are applied
    const appliedNames = new Set(appliedMigrations.map((m) => m.name));
    const missing = options.migrations.filter((name) => !appliedNames.has(name));
    if (missing.length > 0) {
      const appliedNamesList = appliedMigrations.map((m) => m.name);
      throw new Error(
        `Migration(s) not found or not applied: ${missing.join(", ")}. Applied migrations: ${appliedNamesList.join(", ")}`
      );
    }

    // Sort requested migrations in reverse order (newest first) for rollback
    const sortedRequested = [...options.migrations].sort((a, b) =>
      b.localeCompare(a)
    );

    console.log(`Rolling back ${sortedRequested.length} migration(s):`);
    for (const name of sortedRequested) {
      console.log(`  - ${name}`);
    }

    if (options.dryRun) {
      console.log("\n[DRY RUN] Would rollback migrations above");
      return;
    }

    console.log("\nRolling back migrations...");

    // For each requested migration, rollback until we reach it
    // We need to rollback in order, so we'll rollback one at a time
    // and check if we've rolled back the requested one
    const rolledBack = new Set<string>();

    for (const targetName of sortedRequested) {
      // Keep rolling back until we've rolled back this specific migration
      while (!rolledBack.has(targetName)) {
        const currentApplied = await migrator.getMigrations();
        if (currentApplied.length === 0) {
          break; // No more migrations to rollback
        }

        const lastMigration = currentApplied[currentApplied.length - 1];
        const { error } = await migrator.migrateDown();

        if (error) {
          console.error(`✗ Rollback failed:`, error);
          throw error;
        }

        if (lastMigration.name === targetName) {
          rolledBack.add(targetName);
          console.log(`  ✓ ${targetName} rolled back`);
        } else if (requestedNames.has(lastMigration.name)) {
          // We rolled back another requested migration
          rolledBack.add(lastMigration.name);
          console.log(`  ✓ ${lastMigration.name} rolled back`);
        }
      }
    }

    console.log("\n✓ Rollback completed successfully");
  } else if (options.all) {
    // Rollback all migrations
    console.log("Rolling back all migrations...");
    if (options.dryRun) {
      console.log("[DRY RUN] Would rollback all migrations");
      return;
    }

    // Rollback until no more migrations
    let hasMore = true;
    while (hasMore) {
      const { error } = await migrator.migrateDown();
      if (error) {
        // If error, might be no more migrations
        hasMore = false;
        break;
      }
      const remaining = await migrator.getMigrations();
      hasMore = remaining.length > 0;
    }

    console.log("✓ All migrations rolled back");
  } else if (options.to) {
    // Rollback all migrations down to (but not including) the specified one
    console.log(`Rolling back migrations down to: ${options.to}...`);
    if (options.dryRun) {
      console.log("[DRY RUN] Would rollback migrations down to above");
      return;
    }

    // Get current migrations and rollback until we reach the target
    const appliedMigrations = await migrator.getMigrations();
    const targetIndex = appliedMigrations.findIndex((m) => m.name === options.to);

    if (targetIndex === -1) {
      throw new Error(`Migration "${options.to}" not found or not applied`);
    }

    // Rollback all migrations after the target
    const toRollback = appliedMigrations.slice(targetIndex + 1).reverse();

    if (toRollback.length === 0) {
      console.log(`✓ No migrations to rollback (already at or before "${options.to}")`);
      return;
    }

    console.log(`Rolling back ${toRollback.length} migration(s)...`);
    for (let i = 0; i < toRollback.length; i++) {
      const { error } = await migrator.migrateDown();
      if (error) {
        console.error("✗ Rollback failed:", error);
        throw error;
      }
    }

    console.log("✓ Rollback completed successfully");
  } else {
    // Rollback last N migrations (default: 1)
    const count = options.count ?? 1;
    console.log(`Rolling back last ${count} migration(s)...`);
    if (options.dryRun) {
      console.log("[DRY RUN] Would rollback migrations above");
      return;
    }

    for (let i = 0; i < count; i++) {
      const { error } = await migrator.migrateDown();
      if (error) {
        if (i === 0) {
          console.error("✗ Rollback failed:", error);
          throw error;
        }
        // If we've rolled back some, that's okay
        break;
      }
    }

    console.log("✓ Rollback completed successfully");
  }
}

/**
 * Shows migration status
 */
export async function showMigrationStatus(
  db: Kysely<Database>,
  migrationsDir: string
): Promise<void> {
  const migrator = createMigrator(db, migrationsDir);

  // Get all available migrations from provider
  const provider = new FileMigrationProvider({
    fs,
    path: { join },
    migrationFolder: migrationsDir,
  });
  const allMigrations = await provider.getMigrations();
  const allMigrationNames = Object.keys(allMigrations).sort();

  // Get applied migrations
  const appliedMigrations = await migrator.getMigrations();
  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  console.log("\nMigration Status:\n");

  if (allMigrationNames.length === 0) {
    console.log("  No migrations found");
    return;
  }

  for (const name of allMigrationNames) {
    const isApplied = appliedNames.has(name);
    const status = isApplied ? "✓ Applied" : "○ Pending";
    const appliedInfo = isApplied
      ? ` (${appliedMigrations.find((a) => a.name === name)?.executedAt?.toISOString() || "unknown"})`
      : "";

    console.log(`  ${status}  ${name}${appliedInfo}`);
  }

  const pendingCount = allMigrationNames.length - appliedMigrations.length;
  console.log(
    `\nTotal: ${allMigrationNames.length} migrations, ${appliedMigrations.length} applied, ${pendingCount} pending`
  );
}
