/**
 * @repo/vitest - Shared testing utilities and configuration
 * 
 * This package provides:
 * - Base Vitest configuration
 * - Testing utilities and helpers
 * - Shared test setup
 * - MSW integration for API mocking
 */

export { default as baseConfig, browserConfig, typecheckConfig } from "./config";

// Export MSW utilities for use in tests
export { server } from "./msw/server";
export { handlers } from "./msw/handlers";
export { http, HttpResponse, type HttpHandler } from "msw";

/**
 * Common test utilities
 */

/**
 * Wait for a specific condition to be true
 * Useful for testing async operations
 */
export const waitFor = async (
  callback: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await callback()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
};

/**
 * Sleep for a specific duration
 * Useful for testing time-based operations
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a mock function that can be awaited
 */
export const createMockFn = <T extends (...args: any[]) => any>() => {
  const calls: Parameters<T>[] = [];
  const results: ReturnType<T>[] = [];

  const fn = ((...args: Parameters<T>): ReturnType<T> => {
    calls.push(args);
    const result = undefined as ReturnType<T>;
    results.push(result);
    return result;
  }) as T & {
    calls: Parameters<T>[];
    results: ReturnType<T>[];
    mock: {
      calls: Parameters<T>[];
      results: ReturnType<T>[];
    };
  };

  fn.calls = calls;
  fn.results = results;
  fn.mock = { calls, results };

  return fn;
};

