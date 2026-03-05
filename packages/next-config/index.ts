import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

export const config: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },

  // biome-ignore lint/suspicious/useAwait: rewrites is async
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export const withAnalyzer = (sourceConfig: NextConfig): NextConfig =>
  withBundleAnalyzer()(sourceConfig);

type SecurityHeadersOptions = {
  /**
   * Custom Content Security Policy directives
   * If not provided, a sensible default will be used
   */
  contentSecurityPolicy?: string;
  /**
   * Whether to enable HSTS (Strict-Transport-Security)
   * Defaults to true in production, false in development
   */
  enableHSTS?: boolean;
};

/**
 * Adds security headers to Next.js configuration
 * Includes CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy
 */
export const withSecurityHeaders = (
  sourceConfig: NextConfig,
  options: SecurityHeadersOptions = {}
): NextConfig => {
  const isProduction = process.env.NODE_ENV === "production";
  const enableHSTS = options.enableHSTS ?? isProduction;

  // Default CSP that works with PostHog and common services
  const defaultCSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://us.i.posthog.com https://us-assets.i.posthog.com https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://www.google-analytics.com https://www.googletagmanager.com https://*.ably.io https://*.ably-realtime.com wss://*.ably.io wss://*.ably-realtime.com https://*.r2.cloudflarestorage.com https://api.knock.app wss://api.knock.app",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const contentSecurityPolicy =
    options.contentSecurityPolicy ?? defaultCSP;

  return {
    ...sourceConfig,
    // biome-ignore lint/suspicious/useAwait: headers is async
    async headers() {
      const headers = await sourceConfig.headers?.();

      const securityHeaders = [
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy,
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: [
            "camera=()",
            "microphone=()",
            "geolocation=()",
            "interest-cohort=()",
          ].join(", "),
        },
      ];

      // Only add HSTS in production or if explicitly enabled
      if (enableHSTS) {
        securityHeaders.push({
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        });
      }

      return [
        ...(headers ?? []),
        {
          source: "/:path*",
          headers: securityHeaders,
        },
      ];
    },
  };
};
