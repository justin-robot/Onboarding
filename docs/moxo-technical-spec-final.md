# Moxo — Technical Specification (Final)

---

## Technology Stack

### From the Codestack (already available)

| Layer | Technology | Package Location |
|-------|-----------|-----------------|
| Framework | Next.js | apps/app, apps/web, apps/api |
| Database | Neon PostgreSQL | packages/database |
| ORM / Query builder | Kysely (with kysely-neon) | packages/database |
| Authentication | Better Auth | packages/auth |
| Real-time | Ably | packages/realtime |
| Notifications | Knock (@knocklabs) | packages/notifications |
| Email | Resend | apps/app |
| Webhooks | Svix | apps/api |
| File storage | S3-compatible (configurable provider/endpoint) | apps/app (env config) |
| UI components | shadcn/ui + Radix UI | packages/design |
| Styling | Tailwind CSS + class-variance-authority + clsx + tailwind-merge | packages/design |
| Form state | react-hook-form + @hookform | packages/design |
| Date handling | date-fns | packages/design |
| Icons | lucide-react | packages/design |
| Charts | Recharts | packages/design |
| Toasts | Sonner | packages/design |
| Drawers | Vaul | packages/design |
| Command palette | cmdk | packages/design |
| Resizable panels | react-resizable-panels | packages/design |
| Date picker | react-day-picker | packages/design |
| Carousel | embla-carousel-react | packages/design |
| OTP input | input-otp | packages/design |
| Theme | next-themes | packages/design |
| Font | Geist | packages/design |
| Analytics | PostHog + Google Analytics | apps/app, apps/web |
| Payments (optional) | Polar | apps/app |
| Monorepo | Turborepo + pnpm | root |
| Validation | Zod | packages/database, packages/auth, packages/design |

### Needs to Be Added

| Technology | Purpose | Notes |
|-----------|---------|-------|
| dnd-kit | Drag-and-drop for form builder + task/section reordering | Not in current design package |
| SignNow SDK | E-signature API integration | New external service |
| Google APIs (Calendar, OAuth) | Calendar integration + Meet links | New external service |
| BullMQ or similar | Background job queue for thumbnails, scheduled reminders | No job queue visible in codestack — evaluate if Next.js cron routes or Vercel cron are sufficient |
| sharp | Image thumbnail generation | Server-side image processing |

### Not Using

DocuSign (slower approval than SignNow), Pusher/Socket.io (Ably already in codestack), any video SDK (linking to Google Meet), custom WebSocket server (Ably handles this), custom notification infrastructure (Knock handles this).

### Deferred to V2

SMS notifications via Knock (Knock supports SMS — just add the channel later). Scheduling tool API integration (Calendly, Cal.com) — v1 uses manual link entry.

---

## Application Structure

The codestack is a Turborepo monorepo with three apps and shared packages. Moxo will be built primarily in **apps/app** (the authenticated application) with API routes in **apps/api** and shared database logic in **packages/database**.

New Moxo-specific code goes into the existing structure:
- **Database tables and migrations** → packages/database/schemas and packages/database/migrations
- **API routes** → apps/api or apps/app API routes (depending on convention)
- **Moxo UI pages and components** → apps/app
- **Reusable Moxo components** → packages/design/components (if generic enough) or apps/app/components (if Moxo-specific)
- **Webhook handlers** → apps/api (Svix already configured here)

---

## Database Schema

New tables are created via Kysely migrations in packages/database/migrations, following the existing pattern established by the auth migration. The schema file in packages/database/schemas/main.ts defines table types for Kysely's type-safe query builder.

Create tables for all 27 models from the Data Model (Final). UUIDs for all primary keys. Automatic `created_at` and `updated_at` timestamps on every table. Soft deletes via a nullable `deleted_at` timestamp on Workspace, Section, Task, File, Message, and Comment.

JSON columns (Neon PostgreSQL supports JSONB natively) for: form element validation rules, form element options, form field response values, audit log metadata, and the embedded due date structure on Task.

Indexes on all foreign keys plus the common query patterns: task position within section, audit log entries by workspace and date, and notifications by recipient and read status.

Zod schemas should be created alongside Kysely types for request validation on all API endpoints, consistent with how the codestack already uses Zod in the auth and design packages.

---

## Authentication

Better Auth is already configured in the codestack with client, server, handlers, and proxy files. Moxo extends this with invitation-based signup.

An admin invites a member by email. The system sends an invitation email via Resend containing a signup link with a unique token that expires after 72 hours. The invitee clicks the link, creates an account through Better Auth's signup flow, and is automatically added to the workspace with the role from the invitation. Better Auth handles session management, password hashing, and token lifecycle.

The invitation system is Moxo-specific and lives on top of Better Auth: a pending_invitations table stores the token, email, workspace ID, role, and expiration. On signup, the system checks for a valid invitation token and creates the WorkspaceMember record.

---

## API Middleware

All Moxo API routes pass through middleware layers. Auth middleware uses Better Auth's existing session validation. Workspace middleware verifies the current user is a member of the requested workspace and attaches their role. Role middleware checks the user's role meets the minimum required. Error handling follows whatever pattern the codestack already uses for API error responses.

---

## Role-Based Access Control

Admins have full workspace control including member management, settings, and template creation. Account managers can create and edit sections and tasks, reassign tasks, and view all progress. Users can only complete tasks assigned to them, view their own tasks, and participate in chat. For Users, all task queries are filtered to only return tasks they're assigned to.

---

## Workspace, Section, and Task CRUD

Standard create, read, update, and soft delete operations for all three, built as API routes using Kysely for queries.

The workspace get endpoint returns the full workspace with sections and tasks nested, including members and computed progress. Section progress is computed at query time using a Kysely count query — never stored.

Reordering sections and tasks: the frontend sends an ordered array of IDs, the backend updates each record's position to match the array index in a single Kysely transaction.

On task creation: validate the section exists and belongs to the workspace, validate all assignees are workspace members, validate the due date anchor if relative (including circular dependency check), insert the task at the given position and shift downstream tasks, create assignee records, create the type-specific config, write an audit log entry, and trigger notifications via Knock.

---

## Task Flow Engine

### Sequential Unlocking

Tasks within a section execute in order. A task is locked until the task immediately before it is completed. The first task is always unlocked. Derived at query time — a `locked` boolean is included in API responses but never stored. Locked tasks are visually dimmed on the frontend using shadcn/ui's disabled styling patterns.

### Completion Logic

When an assignee completes a task, the system verifies the task is unlocked and the user is assigned. It marks the assignee as completed, then evaluates the completion rule: "any" completes the task immediately, "all" requires every assignee to complete.

When a task transitions to completed, four things happen: dependent due dates are resolved (cascading), the next task's assignees get a "your turn" notification via Knock, the section status is recalculated, and an audit log entry is written. An Ably event broadcasts the change to all workspace subscribers.

Reopening a task resets all assignee statuses, cascades to unresolve dependent due dates, and broadcasts via Ably.

### Section Status

Derived on task status change. All completed → section completed. At least one → in progress. Otherwise → not started.

### Due Dates

Absolute due dates stored directly. Relative due dates store an anchor task ID and offset in days. The resolved date is null until the anchor completes, then computed as the anchor's completion time plus the offset. The frontend uses the react-day-picker from the design package for date selection and date-fns for formatting and relative date display.

Circular dependency prevention: on save, walk the anchor chain and reject if the current task appears in its own chain.

Cascading on completion: resolve all dependent tasks' due dates recursively. Newly resolved dates that are already approaching or overdue trigger Knock notifications immediately.

Cascading on reopen: null out all downstream due dates recursively.

Cascading on delete: clear due dates entirely on all referencing tasks, notify admins via Knock, cascade downstream.

### Position Management

Admin-only. Inserting shifts downstream tasks. Drag-and-drop reordering (using dnd-kit) sends the full ordered ID list. Moving between sections removes from source, inserts into target, recalculates both.

---

## Acknowledgement Task

Admin creates it with attachments and instructions. Assignee reviews and clicks "I acknowledge." Creates an acknowledgement record and delegates to task completion logic.

---

## Approval Task

Approvers are notified via Knock when the task becomes active. Each approves or rejects (rejection requires comments). All approved → task completes. Rejection → task returns to assignee, all statuses reset, approvers re-notified via Knock. Always "allow retry."

---

## Form Builder

### Two UIs, One Data Model

The **builder** (admin) uses dnd-kit for drag-and-drop (needs to be added to the design package). Element palette sidebar with all 14 types. Canvas for drop and reorder. Property editor sidebar using shadcn/ui form components. Multi-page support via tabs.

The **renderer** (assignee) uses react-hook-form (already in the design package). Reads the form config and renders each element using shadcn/ui input components (Input, Textarea, Select, Checkbox, RadioGroup, etc. from the existing component library). Validation rules pass directly to react-hook-form's register function. Multi-page validation before navigation. Toast notifications via Sonner for submission confirmation.

### Saving and Submitting

Form config saved as full replace in a Kysely transaction. Auto-save on 500ms debounce.

On submission, the server re-validates with Zod schemas, saves field responses, writes an audit log entry, and triggers task completion. Draft auto-saving on debounce.

---

## File System

### Upload Architecture

Files stored in the S3-compatible storage already configured in the codestack (STORAGE_PROVIDER, STORAGE_BUCKET, STORAGE_ENDPOINT, etc. from env config). Database stores metadata only. Uploads use presigned URLs: frontend requests one, backend generates it using the configured storage provider, frontend uploads directly, then confirms. On confirmation, async thumbnail generation is triggered.

### Thumbnails

Generated after upload confirmation. Images resized with sharp. PDFs have first page converted to image. Thumbnails uploaded to the same storage provider. If no background job queue is available, this can run as an async function after the confirmation response, or via a Next.js API route triggered by the confirmation handler.

### Versioning

Replacing a file creates a new record linked via `previous_version_id`. Version history retrieved by walking the chain.

### File Management UI

Grid and list views using shadcn/ui's card and table components. Sorting and filtering. Thumbnails displayed via the stored URL.

---

## File Request Task

Uploader uploads files → status flips to "uploaded." No review required → task completes. Review required → reviewers notified via Knock → approve or reject. All approved → complete. Rejection → uploader re-uploads.

---

## SignNow Integration (E-Sign Task)

New dependency — SignNow SDK needs to be added. Moxo pushes documents to SignNow, stores a reference, and listens for webhook events via Svix (the codestack's webhook infrastructure). No embedding.

Admin uploads a document (stored in the S3-compatible storage). Backend sends it to SignNow's API, configures signers, receives document ID and signing URL. Stored in ESignConfig. Signer clicks "Sign" → redirected to SignNow in a new tab. SignNow handles everything.

On completion, SignNow fires a webhook. Svix receives and validates it, routes to the handler which finds the matching task, marks it completed, stores the signed document URL, and triggers task completion. All SignNow events written to the audit log with source "signnow."

---

## Google Calendar / Meet Integration

New dependency — Google APIs need to be added. Workspace admin authorizes via OAuth 2.0. Refresh token stored encrypted in the database.

Once connected: list meetings by querying Calendar API for workspace member events, create events with auto-generated Meet links. Frontend displays meetings in a simple list using shadcn/ui table or card components.

---

## Time Booking Task

V1: manual link entry. Admin pastes a scheduling URL. Assignee clicks "Book Meeting" (opens in new tab), then confirms. Task completes on confirmation.

---

## Ably (Real-Time)

The codestack already has Ably configured in packages/realtime with client.tsx (React provider component) and index.ts (server-side exports).

### Channel Structure

Workspace channels carry task updates and activity events. Workspace chat channels carry messages. User channels carry private notifications. All channels are authenticated — Ably's token auth ensures only workspace members can subscribe to workspace channels.

### Events

Task created, updated, or deleted. Section status changed. Member added or removed. New chat message. The frontend subscribes on mount using the Ably React provider already in the codestack and updates local state when events arrive.

Note: Knock handles notification delivery independently (including its own real-time feed). Ably is used for workspace-level collaboration events, not for notifications.

---

## Chat System

Workspace-scoped messaging. Types: text, annotation (referencing a document or task), and system (auto-generated, no sender). Cursor-based pagination. On send: save to database, link attachments, broadcast via Ably, write audit log entry. System messages created automatically on task events.

Frontend uses shadcn/ui components for the message list, input area, and date separators.

---

## Activity Feed

Read-only paginated view of the audit log filtered by workspace. Displayed in the right sidebar using react-resizable-panels (already in the design package) for the three-panel layout. Perspective-aware phrasing: "You" for current user, name for others.

---

## Audit Log

Centralized service called by all modules. Every significant action writes an immutable, append-only entry. Metadata stored as JSONB. New entries broadcast via Ably for real-time activity feed updates.

Event types: task lifecycle, form submissions, acknowledgements, approvals, e-sign events (from SignNow via Svix webhooks), file operations, bookings, messages, member changes, due date changes, workspace lifecycle.

---

## Knock (Notifications)

The codestack already has Knock configured in packages/notifications with a provider component (provider.tsx), a trigger component (trigger.tsx), and an index.ts for server-side usage. The @knocklabs React components provide a pre-built notification feed and bell icon.

### How Moxo Uses Knock

Instead of building a custom notification service, Moxo defines **workflows** in the Knock dashboard. Each workflow corresponds to a notification event type (task assigned, your turn, due date approaching, approval requested, etc.). Each workflow configures its delivery channels (in-app feed + email for v1, add SMS in v2).

The backend triggers Knock workflows when events occur. Knock handles message generation from templates, delivery routing, in-app feed management, email delivery via Resend (Knock integrates with Resend natively), read/unread state, and user preferences.

The frontend uses Knock's React components — specifically the notification feed provider and the bell trigger — which are already set up in packages/notifications. This replaces the need for a custom notification bell, dropdown, unread count, and mark-as-read logic.

### Knock Workflows to Create

| Workflow | Trigger | Channels |
|----------|---------|----------|
| task-assigned | Task created with assignees | In-app, email |
| task-your-turn | Previous task in sequence completed | In-app, email |
| due-date-approaching | Cron job finds task due within 24 hours | In-app, email |
| due-date-passed | Cron job finds overdue task | In-app, email |
| approval-requested | Approval task activated or resubmitted | In-app, email |
| approval-rejected | Approver rejects submission | In-app, email |
| esign-ready | E-sign task created, document pushed to SignNow | In-app, email |
| file-ready-for-review | File uploaded on a task requiring review | In-app, email |
| file-rejected | Reviewer rejects uploaded file | In-app, email |
| meeting-starting | Cron job finds meeting starting within 15 minutes | In-app, email |
| comment-added | Comment posted on a task | In-app, email |
| due-date-cleared | Anchor task deleted, dependent due dates removed | In-app (admin only) |

### Email Delivery

Knock sends emails through Resend (already configured in the codestack). Email templates are configured in the Knock dashboard, not in application code. Knock handles delivery timing, retries, and deduplication.

---

## Due Date Reminder Scheduler

A scheduled job runs periodically (via Next.js cron route, Vercel cron, or an external scheduler) to check for approaching and overdue due dates. It queries for incomplete tasks with resolved due dates approaching within 24 hours and tasks already overdue. Triggers the appropriate Knock workflows. Deduplication is handled by Knock's built-in message deduplication — each trigger includes a deduplication key combining the task ID, event type, and date so the same reminder isn't sent twice in the same day.

---

## UI Structure

### Layout

Three-panel layout built with **react-resizable-panels** (already in the design package). Workspace list sidebar on the left, main content in the center (tabs: Flow and Files), and a right panel for activity feed / task details / chat. The right panel context switches using **vaul** drawers on smaller screens.

### Responsive Breakpoints

Desktop (≥1024px): full three-column layout. Tablet (768-1023px): two columns, sidebar becomes a vaul drawer, right panel collapsible. Mobile (<768px): single column, bottom tab navigation, right panel becomes full-screen vaul drawer.

### Key Components

All built on top of the existing shadcn/ui + Radix component library:

**TaskCard** — Built with shadcn Card component. Step badge (checkmark/number/lock icon from lucide-react), task type icon (color-coded via Tailwind), title, status badge, assignee avatar initials, and contextual action Button.

**SectionHeader** — Collapsible section using shadcn Collapsible. Title, progress badge, chevron icon, admin overflow via shadcn DropdownMenu.

**Timeline Connector** — Custom component. Vertical line with step badges connecting TaskCards.

**ActionDetailsPanel** — Slide-over using vaul Drawer (mobile/tablet) or react-resizable-panels (desktop). Full task context with type-specific content, progress section, activity log, and comment input using shadcn Textarea.

**NotificationBell** — Knock's pre-built React notification feed component from packages/notifications. Already handles unread count, dropdown, and mark-as-read.

**AssigneeSearch** — Built with cmdk (command palette, already in design package). Search by name or email with autocomplete dropdown.

**DatePicker** — react-day-picker (already in design package) for absolute due dates. Custom relative date selector for "X days after [task]" configuration.

**FormBuilder Canvas** — dnd-kit (needs to be added) for drag-and-drop. Element palette, sortable canvas, and property editor sidebar using shadcn form components.

**FormRenderer** — react-hook-form (already in design package) with shadcn Input, Textarea, Select, RadioGroup, Checkbox, and other form primitives.

**FileGrid / FileList** — shadcn Card for grid view, shadcn Table for list view. Sort and filter controls via shadcn Select and Button.

**MembersList** — shadcn Table with avatar initials, name, email, role Badge, and admin actions via DropdownMenu.

**WorkspaceSettings** — Inline editing using shadcn Input with edit/save toggle. Danger zone with shadcn AlertDialog for confirmation.

**Toast notifications** — Sonner (already in design package) for all transient feedback (task completed, form saved, error messages).

### Workspace Settings

Identity section (name, description, due date — inline editable), reminders section, and danger zone (archive and delete with AlertDialog confirmation).

---

## Cross-Cutting Concerns

### Error Handling

Backend normalizes errors to a consistent format. Frontend uses Sonner toasts for API errors and inline validation errors via react-hook-form.

### Soft Deletes

Nullable `deleted_at` on Workspace, Section, Task, File, Message, and Comment. All Kysely queries include a `.where("deleted_at", "is", null)` condition by default (can be abstracted into a reusable query helper). Archive sets the timestamp, restore clears it. Permanent deletion is admin-only with AlertDialog confirmation.

### Transactions

Kysely transactions for multi-table operations: task creation, task deletion with cascades, form config saves, and reordering.

### Rate Limiting

Auth endpoints: 10/minute per IP. File presigning: 20/minute per user. General API: 100/minute per user. Svix webhook endpoints: 1000/minute per IP.

### Logging

Structured JSON for all API requests: timestamp, method, path, user ID, workspace ID, status, response time.

### Analytics

PostHog (already configured) for product analytics. Track key events: workspace created, task completed, form submitted, document signed.

---

## What the Codestack Provides vs. What Moxo Builds

### Already handled by the codestack

- Project structure, build system, and deployment pipeline (Turborepo + Next.js)
- Authentication and session management (Better Auth)
- Email delivery (Resend)
- Real-time infrastructure (Ably)
- Notification infrastructure, feed UI, and delivery (Knock)
- Webhook ingestion and validation (Svix)
- File storage connection (S3-compatible, pre-configured)
- UI component library (shadcn/ui + Radix + all utilities)
- Form state management (react-hook-form)
- Date handling (date-fns + react-day-picker)
- Toast notifications (Sonner)
- Panel layouts (react-resizable-panels)
- Drawer/sheet overlays (vaul)
- Search/command palette (cmdk)
- Analytics (PostHog)
- Validation (Zod)
- Theming (next-themes)

### Moxo builds on top

- Database schema (27 tables via Kysely migrations)
- All API endpoints (CRUD, task flow, completions, submissions, reviews)
- Task flow engine (sequential unlocking, completion rules, due date cascading)
- Form builder UI (dnd-kit canvas + element palette + property editor)
- Form renderer (react-hook-form mapped to shadcn inputs)
- SignNow integration (API calls + Svix webhook handler)
- Google Calendar/Meet integration (OAuth + API calls)
- Chat system (API + Ably broadcasting)
- Audit log service (centralized write function + Ably broadcasting)
- Knock workflow configuration (define 12 workflows in Knock dashboard)
- Due date reminder scheduler (cron job triggering Knock)
- All Moxo-specific page layouts and components (TaskCard, SectionHeader, Timeline, etc.)
- File upload flow (presigned URLs + thumbnail generation)
