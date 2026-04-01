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

// Get database URL - will throw if not set
const dbUrl = getDatabaseUrl();
if (!dbUrl) {
  throw new Error(
    `Database URL is not defined. Please set DATABASE_URL_${
      process.env.NODE_ENV === "production" ? "PROD" : "DEV"
    }`
  );
}

// Export main database instance (direct, no proxy)
export const database = new Kysely<Database>({
  dialect: new NeonDialect({
    neon: neon(dbUrl),
  }),
});

// Export Pool for BetterAuth (direct, no proxy)
export const pool = new Pool({ connectionString: dbUrl });

// Export createDb for migrations and seeds (they pass their own URL)
export { createDb };
export * from "./schemas/main";
