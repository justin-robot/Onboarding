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

// Lazy initialization for database to allow migrations to run
// without DATABASE_URL_DEV being set (migrations use DATABASE_URL_DEV_ADMIN)
let _database: Kysely<Database> | null = null;

// Export main database instance (lazy via Proxy)
export const database = new Proxy({} as Kysely<Database>, {
  get(_, prop) {
    if (!_database) {
      _database = createDb();
    }
    return (_database as any)[prop];
  },
});

// Export Pool for BetterAuth (HTTP mode, no WebSocket connections)
// NOTE: BetterAuth requires a real Pool instance, not a Proxy wrapper.
// We use Object.defineProperty for lazy initialization that returns the actual Pool.
let _pool: Pool | null = null;

const getPool = (): Pool => {
  if (!_pool) {
    const url = getDatabaseUrl();
    if (!url) {
      throw new Error(
        `Database URL is not defined for Pool. Please set DATABASE_URL_${
          process.env.NODE_ENV === "production" ? "PROD" : "DEV"
        }`
      );
    }
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
};

// Export pool as a getter that returns the real Pool instance
// This allows lazy initialization while giving BetterAuth an actual Pool object
export const pool: Pool = new Proxy({} as Pool, {
  get(_, prop) {
    const realPool = getPool();
    const value = (realPool as any)[prop];
    // Bind methods to the real pool instance
    return typeof value === "function" ? value.bind(realPool) : value;
  },
  // These traps help BetterAuth recognize this as a Pool-like object
  getPrototypeOf() {
    return Pool.prototype;
  },
  has(_, prop) {
    return prop in getPool();
  },
});

// Export createDb for migrations
export { createDb };
export * from "./schemas/main";

