import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW Server Setup for Node.js (Vitest)
 * 
 * This creates a request interception server for Node.js environments.
 * The server is configured with the handlers defined in ./handlers.ts
 * 
 * @see https://mswjs.io/docs/api/setup-server
 */
export const server = setupServer(...handlers);

