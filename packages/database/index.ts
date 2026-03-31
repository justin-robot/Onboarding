// Only enforce server-only in Next.js context (not for migrations)
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { Kysely } from "kysely";
import { NeonDialect } from "kysely-neon";
import type { Database } from "./schemas/main";

// Configure PlanetScale HTTP mode (instead of WebSockets)
// https://planetscale.com/changelog/neon-serverless-driver-http-mode
neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;

// Get database URL based on environment
const getDatabaseUrl = (env?: "dev" | "prod") => {
  if (env === "prod" || process.env.NODE_ENV === "production") {
    return process.env.DATABASE_URL_PROD;
  }
  return process.env.DATABASE_URL_DEV;
};

// Create database instance with HTTP mode (no WebSockets)
const createDb = (url?: string) => {
  const connectionString = url || getDatabaseUrl();

  if (!connectionString) {
    throw new Error(
      `Database URL is not defined. Please set DATABASE_URL_${
        process.env.NODE_ENV === "production" ? "PROD" : "DEV"
      }`
    );
  }

  return new Kysely<Database>({
    dialect: new NeonDialect({
      neon: neon(connectionString),
    }),
  });
};

// Lazy initialization for database and pool to allow migrations to run
// without DATABASE_URL_DEV being set (migrations use DATABASE_URL_DEV_ADMIN)
let _database: Kysely<Database> | null = null;
let _pool: Pool | null = null;

// Export main database instance (lazy)
export const database = new Proxy({} as Kysely<Database>, {
  get(_, prop) {
    if (!_database) {
      _database = createDb();
    }
    return (_database as any)[prop];
  },
});

// Export Pool for BetterAuth (HTTP mode, no WebSocket connections) (lazy)
export const pool = new Proxy({} as Pool, {
  get(_, prop) {
    if (!_pool) {
      _pool = new Pool({ connectionString: getDatabaseUrl() });
    }
    return (_pool as any)[prop];
  },
});

// Export createDb for migrations
export { createDb };
export * from "./schemas/main";

