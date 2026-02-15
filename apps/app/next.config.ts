import { config, withAnalyzer, withSecurityHeaders } from "@repo/next-config";
import { withLogging } from "@repo/observability/next-config";
import type { NextConfig } from "next";

let nextConfig: NextConfig = withLogging({
  ...config,
  // Externalize packages that have Node.js-specific code
  serverExternalPackages: [
    "ably",
    "got",
    "keyv",
    "cacheable-request",
    "sharp",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
  // Webpack fallback for when turbopack isn't used
  webpack: (webpackConfig: { externals?: unknown[] }, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      // Externalize ably and its problematic dependencies on server
      webpackConfig.externals = webpackConfig.externals || [];
      if (Array.isArray(webpackConfig.externals)) {
        webpackConfig.externals.push("ably", "got", "keyv", "cacheable-request");
      }
    }
    return webpackConfig;
  },
});
nextConfig = withSecurityHeaders(nextConfig);

if (process.env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
