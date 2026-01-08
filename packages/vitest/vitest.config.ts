import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["__tests__/**/*.test.ts"],
    },
  })
);

