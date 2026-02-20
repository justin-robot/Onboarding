# Environment Variables

**Environment variables are configured per-application using `.env.local` files in each app directory.**

This follows [Turborepo best practices](https://turborepo.ai/docs/crafting-your-repository/using-environment-variables) for monorepo environment variable management.

## Setup

Each application has its own `.env.local` file that is automatically loaded by Next.js:

### App (Main Application)

```bash
cd apps/app
cp .env.local.example .env.local
# Edit .env.local with your values
```

### Web (Marketing Site)

```bash
cd apps/web
cp .env.local.example .env.local
# Edit .env.local with your values
```

**Note:** All `.env.local` files are in `.gitignore` and will not be committed to git.

## Environment Variables by Application

### App (apps/app/.env.local)

The main application (includes API routes, cron jobs, and webhooks):

```bash
# Core
ANALYZE=
NEXT_RUNTIME=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3001

# Database
DATABASE_URL_DEV=postgresql://user:password@host:5432/dbname
DATABASE_URL_PROD=

# Authentication (Better Auth)
# Generate with: npx @better-auth/cli secret
BETTER_AUTH_SECRET=

# Email (Resend)
RESEND_TOKEN=
RESEND_FROM=noreply@example.com

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=

# Notifications (Knock)
NEXT_PUBLIC_KNOCK_API_KEY=
NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID=

# AI (OpenAI)
OPENAI_API_KEY=

# Cron Jobs (for due date reminders, meeting reminders)
CRON_SECRET=

# Webhooks (Svix) - for SignNow and other external services
SVIX_TOKEN=
```

### Web (apps/web/.env.local)

The marketing website needs fewer variables:

```bash
# Core
ANALYZE=
NEXT_RUNTIME=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3001

# Email (for contact form)
RESEND_TOKEN=
RESEND_FROM=noreply@example.com

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

## Database Migrations

Database migrations use separate admin connection strings that should be configured in your root `.env.local` file (this is an exception to the per-app pattern):

```bash
# Root .env.local (for migrations only)
DATABASE_URL_DEV_ADMIN=postgresql://admin:password@host:5432/dbname
DATABASE_URL_PROD_ADMIN=postgresql://admin:password@host:5432/dbname
```

Run migrations with:
- `pnpm migrate:dev` - Development database
- `pnpm migrate:prod` - Production database

## Additional Services (Optional)

Some packages support additional services that can be configured if needed:

```bash
# Payments (Polar) - Add to apps/app/.env.local if using
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_SERVER=
POLAR_MODE=sandbox

# Internationalization (Languine) - Add to apps that need i18n
LANGUINE_PROJECT_ID=

# Notifications (Knock) - Add secret key to apps/app/.env.local if using server-side
KNOCK_SECRET_API_KEY=

# Realtime (Ably) - Add to apps/app/.env.local if using realtime features
ABLY_API_KEY=
NEXT_PUBLIC_ABLY_API_KEY=

# Storage (S3/R2/Custom) - Add to apps/app/.env.local if using file storage
STORAGE_PROVIDER=s3
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_PUBLIC_URL=

```

## Turborepo Configuration

Environment variables are configured in `turbo.json` to ensure proper cache invalidation. The configuration uses:

- **Strict Mode** (default) - Only variables listed in `env` keys are available at runtime
- **Per-task env keys** - Each task declares which variables it needs
- **Wildcard support** - Use `DATABASE_URL_*` to match multiple variables

This ensures that:
- Cache is invalidated when relevant variables change
- Unrelated variable changes don't invalidate cache unnecessarily
- Missing variables cause build failures (preventing misconfiguration)
