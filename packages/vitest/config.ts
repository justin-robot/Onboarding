import { defineConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

/**
 * Base Vitest configuration for all packages
 * 
 * Usage in your package:
 * ```ts
 * import { defineConfig, mergeConfig } from "vitest/config";
 * import baseConfig from "@repo/vitest/config";
 * 
 * export default mergeConfig(
 *   baseConfig,
 *   defineConfig({
 *     // Your custom config
 *   })
 * );
 * ```
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.config.{js,ts}",
        "**/*.test.{js,ts}",
        "**/*.spec.{js,ts}",
      ],
    },
    typecheck: {
      enabled: false,
    },
  },
}) as UserConfig;

/**
 * Browser/DOM testing configuration (for React components, etc.)
 */
export const browserConfig = defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.config.{js,ts}",
        "**/*.test.{js,ts}",
        "**/*.spec.{js,ts}",
      ],
    },
  },
}) as UserConfig;

/**
 * Configuration for testing with TypeScript type checking
 */
export const typecheckConfig = defineConfig({
  test: {
    globals: true,
    environment: "node",
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.json",
    },
  },
}) as UserConfig;

