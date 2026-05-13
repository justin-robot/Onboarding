# Moxo

**Workflow and task management platform for client onboarding and structured collaboration.**

## Overview

Moxo is a full-stack application for managing structured workflows, client onboarding, and task completion. It enables teams to create workspaces with sequential tasks that guide users through multi-step processes like document collection, form submissions, approvals, and e-signatures.

Built with [Next.js](https://nextjs.org/) and [Turborepo](https://turborepo.com) in a monorepo structure.

## Features

### Core Workflow Engine

- **Workspaces** — Containers for client engagements with sections and tasks
- **Sequential Tasks** — Tasks unlock in order as previous tasks complete
- **Multiple Task Types** — Acknowledgement, approval, form submission, file request, e-signature, time booking
- **Due Dates** — Absolute dates or relative dates anchored to task completion
- **Role-Based Access** — Admin, Account Manager, and User roles with appropriate permissions

### Task Types

- **Acknowledgement** — User reviews content and confirms understanding
- **Approval** — Submit work for review; approvers can approve or reject
- **Form** — Drag-and-drop form builder with 14 element types
- **File Request** — Upload files with optional review workflow
- **E-Sign** — SignNow integration for document signatures
- **Time Booking** — Schedule meetings via linked calendars

### Collaboration

- **Real-time Updates** — Live task status and activity via [Ably](https://ably.com)
- **Workspace Chat** — Messaging with annotations and system messages
- **Activity Feed** — Audit log of all workspace events
- **Notifications** — In-app and email notifications via [Knock](https://knock.app)

### File Management

- **S3-Compatible Storage** — Upload files with presigned URLs
- **Thumbnails** — Auto-generated previews for images and PDFs
- **Versioning** — Track file history with version chains

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io) (recommended) or npm/yarn/bun
- Database: [Neon](https://neon.tech) PostgreSQL database
- Service accounts for:
  - [Better Auth](https://www.better-auth.com) (authentication)
  - [Resend](https://resend.com) (email)
  - [Knock](https://knock.app) (notifications)
  - [Ably](https://ably.com) (real-time)
  - [SignNow](https://www.signnow.com) (e-signatures) - optional
  - [PostHog](https://posthog.com) (analytics) - optional

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
- App: http://localhost:3000 (includes API routes at /api/*)
- Web: http://localhost:3001

## Structure

Moxo uses a monorepo structure managed by Turborepo:

```
platform/
├── apps/
│   ├── app/                 # Main Moxo application (port 3000)
│   ├── web/                 # Marketing website (port 3001)
│   └── email/               # Email templates
└── packages/
    ├── auth/                 # Authentication (Better Auth)
    ├── database/             # Database schema and queries (Kysely + Neon)
    ├── design/               # UI components (shadcn/ui)
    ├── notifications/        # Notifications (Knock)
    ├── realtime/             # Real-time events (Ably)
    ├── storage/              # File storage (S3-compatible)
    └── ...                   # Additional shared packages
```

The main application (`apps/app`) contains the Moxo-specific business logic: workspace management, task flow engine, form builder, and integrations.

## Environment Variables

Environment variables are configured per-application following [Turborepo best practices](https://turborepo.ai/docs/crafting-your-repository/using-environment-variables):

- **apps/app/.env.local** - Main application environment variables (includes API routes)
- **apps/web/.env.local** - Marketing website environment variables
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
