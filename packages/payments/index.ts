import "server-only";
import { Polar } from "@polar-sh/sdk";

const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;

if (!polarAccessToken) {
  console.warn("POLAR_ACCESS_TOKEN not configured. Payment features will be disabled.");
}

/**
 * Create a Polar client instance
 */
export const createPolarClient = (): Polar | null => {
  if (!polarAccessToken) {
    return null;
  }

  return new Polar({
    accessToken: polarAccessToken,
    server: (process.env.POLAR_MODE || "sandbox") as "sandbox" | "production",
  });
};

/**
 * Get Polar client instance
 */
export const getPolarClient = () => {
  return createPolarClient();
};

// Re-export Polar types
export type { Polar } from "@polar-sh/sdk";
