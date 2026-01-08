import { config, withAnalyzer, withSecurityHeaders } from "@repo/next-config";
import { withLogging } from "@repo/observability/next-config";
import type { NextConfig } from "next";

let nextConfig: NextConfig = withLogging(config);
nextConfig = withSecurityHeaders(nextConfig);

if (process.env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
