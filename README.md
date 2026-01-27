# Platform

**Production-grade monorepo application built with Next.js and Turborepo.**

## Overview

Platform is a full-stack application built with modern web technologies, designed for scalability and developer experience. It uses a monorepo structure managed by [Turborepo](https://turborepo.com) and [Next.js](https://nextjs.org/) for the frontend and API layers.

### Philosophy

Platform is built around core principles:

- **Fast** — Quick to build, run, deploy, and iterate on
- **Type-Safe** — End-to-end type safety with TypeScript
- **Modern** — Latest stable features with healthy community support
- **Scalable** — Monorepo structure that scales with your team

## Features

Platform comes with a comprehensive set of features:

### Apps

- **Web** — Marketing website (port 3001)
- **App** — Main application with authentication and database integration (port 3000)
- **API** — RESTful API server with health checks and cron jobs (port 3002)
- **Email** — Email templates with React Email

### Packages

- **Authentication** — Powered by [Better Auth](https://www.better-auth.com)
- **Database** — Type-safe database access with [Kysely](https://kysely.dev) and [Neon](https://neon.tech) or [Planetscale](https://planetscale.com)
- **Design System** — Comprehensive component library built on [shadcn/ui](https://ui.shadcn.com) with dark mode support
- **Email** — Transactional emails via [Resend](https://resend.com)
- **Analytics** — Product analytics with [PostHog](https://posthog.com) and web analytics with [Google Analytics](https://developers.google.com/analytics)
- **Observability** — Error tracking and logging via PostHog
- **Administration** — Admin dashboard with ra-core
- **SEO** — Metadata management, sitemaps, and JSON-LD
- **AI** — AI integration utilities with OpenAI
- **Payments** — Payment processing with [Polar](https://polar.sh) (checkout, subscriptions)
- **Notifications** — In-app notifications with [Knock](https://knock.app)
- **Realtime** — Real-time messaging and pub/sub with [Ably](https://ably.com)
- **Storage** — Platform-agnostic file storage (S3, Cloudflare R2, or custom endpoints)
- **Internationalization** — Multi-language support with locale detection and RTL support
- **Testing** — Shared [Vitest](https://vitest.dev) configuration with [MSW](https://mswjs.io) integration for API mocking
- **Webhooks** — Webhook handling and verification

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io) (recommended) or npm/yarn/bun
- Database: [Neon](https://neon.tech) or [Planetscale](https://planetscale.com) PostgreSQL database
- Service accounts for:
  - [Better Auth](https://www.better-auth.com) (authentication)
  - [Resend](https://resend.com) (email)
  - [PostHog](https://posthog.com) (analytics)
  - [Polar](https://polar.sh) (payments) - optional
  - [Knock](https://knock.app) (notifications) - optional
  - [Ably](https://ably.com) (realtime) - optional

### Installation

Clone the repository and install dependencies:

```sh
git clone <your-repo-url>
cd platform
pnpm install
```

### Setup

1. **Configure environment variables** for each app:
   ```sh
   # App (main application)
   cd apps/app
   cp .env.local.example .env.local
   # Edit .env.local with your values
   
   # Web (marketing site)
   cd ../web
   cp .env.local.example .env.local
   # Edit .env.local with your values
   
   # API (API server)
   cd ../api
   cp .env.local.example .env.local
   # Edit .env.local with your values
   
   cd ../..
   ```

2. **Configure database migration credentials** (root `.env.local`):
   ```sh
   # Create root .env.local for migrations only
   cat > .env.local << EOF
   DATABASE_URL_DEV_ADMIN=postgresql://admin:password@host:5432/dbname
   DATABASE_URL_PROD_ADMIN=postgresql://admin:password@host:5432/dbname
   EOF
   ```
   
   Key environment variables to configure:
   - Database URLs (development and production)
   - Better Auth secret (generate with `npx @better-auth/cli secret`)
   - API keys for all service integrations
   - See [env.md](./env.md) for complete list

3. **Run database migrations:**
   ```sh
   cd packages/database && pnpm migrate:dev
   # Or from root: pnpm --filter @repo/database migrate:dev
   ```

4. **Start the development server:**
   ```sh
   pnpm dev
   ```

This will start all apps:
- Web: http://localhost:3001
- App: http://localhost:3000
- API: http://localhost:3002

## Structure

Platform uses a monorepo structure managed by Turborepo:

```
platform/
├── apps/                    # Deployable applications
│   ├── web/                 # Marketing website (port 3001)
│   ├── app/                 # Main application (port 3000)
│   ├── api/                 # API server (port 3002)
│   └── email/               # Email templates
└── packages/                # Shared packages
    ├── ai/                  # AI integration utilities
    ├── analytics/            # Analytics providers (PostHog, Google Analytics)
    ├── auth/                 # Authentication (Better Auth)
    ├── database/             # Database access (Kysely + Planetscale PG/Neon)
    ├── design/               # UI component library (shadcn/ui)
    ├── email/                # Email templates (React Email)
    ├── internationalization/ # i18n support with locale detection
    ├── next-config/          # Shared Next.js configuration
    ├── notifications/        # Notifications (Knock)
    ├── observability/        # Error tracking and logging
    ├── payments/             # Payment processing (Polar)
    ├── realtime/             # Real-time messaging (Ably)
    ├── seo/                  # SEO utilities (metadata, sitemaps)
    ├── storage/              # File storage (S3, R2, custom)
    ├── typescript-config/    # Shared TypeScript configurations
    ├── vitest/               # Testing utilities (Vitest + MSW)
    └── webhooks/             # Webhook handling
```

Each app is self-contained and independently deployable. Packages are shared across apps for consistency and maintainability.

**Note:** All packages provide SDK/client initialization only. Specific usage and business logic should be implemented in the apps themselves.

## Environment Variables

Environment variables are configured per-application following [Turborepo best practices](https://turborepo.ai/docs/crafting-your-repository/using-environment-variables):

- **apps/app/.env.local** - Main application environment variables
- **apps/web/.env.local** - Marketing website environment variables
- **apps/api/.env.local** - API server environment variables
- **Root .env.local** - Database migration admin credentials only

Each app has a `.env.local.example` file showing required variables. See [env.md](./env.md) for detailed documentation.

## Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps and packages
- `pnpm test` - Run tests across all packages
- `pnpm migrate:dev` - Run database migrations (development)
- `pnpm migrate:prod` - Run database migrations (production)
- `pnpm check` - Run type checking and linting
- `pnpm fix` - Auto-fix linting issues

## License

MIT
