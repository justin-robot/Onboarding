import { config } from "dotenv";
import { resolve } from "node:path";

// Load environment variables from root .env.local
config({ path: resolve(__dirname, "../../.env.local") });
