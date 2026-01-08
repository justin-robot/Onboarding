import "server-only";
import { Knock } from "@knocklabs/node";

const knockSecretKey = process.env.KNOCK_SECRET_API_KEY;

if (!knockSecretKey) {
  console.warn("KNOCK_SECRET_API_KEY not configured. Notification features will be disabled.");
}

/**
 * Create a Knock client instance
 */
export const createKnockClient = (): Knock | null => {
  if (!knockSecretKey) {
    return null;
  }

  return new Knock({ apiKey: knockSecretKey });
};

/**
 * Get Knock client instance
 */
export const getKnockClient = () => {
  return createKnockClient();
};

// Client-side exports (must be in separate files due to "use client")
export * from "./components/provider";
export * from "./components/trigger";

// Re-export Knock types
export type { Knock } from "@knocklabs/node";
