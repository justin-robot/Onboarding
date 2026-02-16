import { config } from "dotenv";
import { resolve } from "node:path";
import { vi } from "vitest";

// Mock server-only to allow tests to run
vi.mock("server-only", () => ({}));

// Load environment variables from root .env.local
config({ path: resolve(__dirname, "../../.env.local") });
