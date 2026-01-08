/**
 * Global test setup file
 * 
 * This file runs before all tests and can be used to:
 * - Set up global test utilities
 * - Configure test environment
 * - Add global matchers
 * - Mock environment variables
 * - Configure MSW for API mocking
 */

import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./msw/server";

// Set up test environment variables
process.env.NODE_ENV = "test";

// Enable MSW API mocking before tests run
beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests are done
afterAll(() => {
  server.close();
});

// Example: Add custom matchers (if needed)
// import { expect } from "vitest";
// expect.extend({
//   toBeWithinRange(received: number, floor: number, ceiling: number) {
//     const pass = received >= floor && received <= ceiling;
//     if (pass) {
//       return {
//         message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
//         pass: true,
//       };
//     }
//     return {
//       message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
//       pass: false,
//     };
//   },
// });

