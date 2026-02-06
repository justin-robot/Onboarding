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

// Export main database instance
export const database = createDb();

// Export Pool for BetterAuth (HTTP mode, no WebSocket connections)
export const pool = new Pool({ 
  connectionString: getDatabaseUrl() 
});

// Export createDb for migrations
export { createDb };
export * from "./schemas/main";

// Export services
export { workspaceService } from "./services/workspace";
export type { WorkspaceWithNested, SectionWithTasks } from "./services/workspace";

export { sectionService } from "./services/section";
export type { SectionProgress } from "./services/section";

export { taskService } from "./services/task";

export { dependencyService, CircularDependencyError } from "./services/dependency";
