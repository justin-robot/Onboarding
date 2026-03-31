-- Moxo V1 Sprint Tasks
-- Load with: sqlite3 .pm/tasks.db < .pm/todo/moxo-v1/tasks.sql

-- =====================
-- 01-workspace-crud.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 1, '01-workspace-crud.md', 'Create workspace service with CRUD operations', 'actions', 'database, server-actions',
  'Unit tests pass for create, read, update, soft-delete. Workspace with sections/tasks returns nested structure.',
  'Build workspace service using Kysely. Include: create workspace, get workspace by ID (with nested sections/tasks), update workspace, soft-delete (set deletedAt). All queries filter WHERE deletedAt IS NULL.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 2, '01-workspace-crud.md', 'Create section service with CRUD + position management', 'actions', 'database, server-actions',
  'Unit tests pass. Reordering updates positions correctly. Sections return with tasks nested.',
  'Build section service. Include: create section at position, get sections for workspace (ordered), update section, soft-delete, reorder (accepts array of IDs, updates positions in transaction). Progress computed at query time.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 3, '01-workspace-crud.md', 'Create task service with CRUD + position management', 'actions', 'database, server-actions',
  'Unit tests pass. Reordering works within section. Moving between sections works.',
  'Build task service. Include: create task with type, get task by ID, update task, soft-delete, reorder within section, move to different section (updates both source and target positions).');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 4, '01-workspace-crud.md', 'Create API routes for workspace, section, task', 'actions', 'server-actions',
  'Integration tests pass. Routes follow REST conventions. Proper error handling.',
  'Create API routes in apps/app or apps/api. RESTful: GET/POST/PUT/DELETE. Use services from previous tasks. Apply auth middleware.');

-- Dependencies for 01-workspace-crud
INSERT INTO task_dependencies VALUES ('moxo-v1', 2, 'moxo-v1', 1);  -- section depends on workspace
INSERT INTO task_dependencies VALUES ('moxo-v1', 3, 'moxo-v1', 2);  -- task depends on section
INSERT INTO task_dependencies VALUES ('moxo-v1', 4, 'moxo-v1', 3);  -- routes depend on all services

-- =====================
-- 02-task-dependencies.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 5, '02-task-dependencies.md', 'Create dependency service with CRUD and circular detection', 'actions', 'database, server-actions',
  'Unit tests pass. Circular dependencies rejected with error. Chain walking works for deep graphs.',
  'Build TaskDependency service. Include: add dependency, remove dependency, get dependencies for task. Circular detection: walk chain recursively, reject if task appears in own chain. Handle all 3 types: unlock, date_anchor, both.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 6, '02-task-dependencies.md', 'Add unlock resolution logic', 'actions', 'database, server-actions',
  'Unit tests pass. isTaskUnlocked(taskId) returns correct boolean. Handles multi-dependency cases.',
  'Add isTaskUnlocked() function. Task is unlocked when ALL unlock/both dependencies are completed. Query dependency graph and check each prerequisite status.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 7, '02-task-dependencies.md', 'Wire dependency checks into task queries', 'actions', 'database, server-actions',
  'Tasks include locked boolean in API responses. Derived at query time, never stored.',
  'Modify task GET endpoints to include locked field. Compute by calling isTaskUnlocked(). Add to nested task queries in workspace/section responses.');

-- Dependencies for 02-task-dependencies
INSERT INTO task_dependencies VALUES ('moxo-v1', 5, 'moxo-v1', 3);  -- depends on task service
INSERT INTO task_dependencies VALUES ('moxo-v1', 6, 'moxo-v1', 5);  -- unlock logic depends on dependency service
INSERT INTO task_dependencies VALUES ('moxo-v1', 7, 'moxo-v1', 6);  -- wiring depends on unlock logic

-- =====================
-- 03-task-type-configs.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 8, '03-task-type-configs.md', 'Create config services for all 6 task types', 'actions', 'database, server-actions',
  'Unit tests pass for CRUD on each config type. Creating task auto-creates appropriate config.',
  'Build services for: FormConfig, AcknowledgementConfig, TimeBookingConfig, ESignConfig, FileRequestConfig, ApprovalConfig. Auto-create config when task created based on task.type. Each config has 1:1 relationship with task.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 9, '03-task-type-configs.md', 'Add config loading to task queries', 'actions', 'database, server-actions',
  'Task GET includes type-specific config in response. Polymorphic loading based on task.type.',
  'Modify task queries to include type_config field. Load appropriate config based on task.type. Handle null configs gracefully.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 10, '03-task-type-configs.md', 'Add form element CRUD with validation schema support', 'actions', 'database, server-actions',
  'Unit tests pass. Elements store validation rules as JSONB. Position management works.',
  'Build FormPage and FormElement services. Elements have: type, label, placeholder, helpText, required, position, options (JSONB), validation (JSONB). Validation schema matches react-hook-form register API.');

-- Dependencies for 03-task-type-configs
INSERT INTO task_dependencies VALUES ('moxo-v1', 8, 'moxo-v1', 3);   -- depends on task service
INSERT INTO task_dependencies VALUES ('moxo-v1', 9, 'moxo-v1', 8);   -- loading depends on config services
INSERT INTO task_dependencies VALUES ('moxo-v1', 10, 'moxo-v1', 8);  -- form elements depend on config services

-- =====================
-- 04-task-flow-engine.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 11, '04-task-flow-engine.md', 'Create task completion service', 'actions', 'database, server-actions',
  'Unit tests pass. "any" rule completes on first assignee. "all" rule requires every assignee. Status transitions correctly.',
  'Build completeTask() function. Check assignee is assigned and task is unlocked. Mark assignee completed. Evaluate completion rule: any = immediate complete, all = check all assignees. Update task status and completedAt.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 12, '04-task-flow-engine.md', 'Add due date cascading on task events', 'actions', 'database, server-actions',
  'Unit tests pass. Completion resolves dependent due dates. Reopen nulls them. Delete clears and notifies. Recursive cascading works.',
  'On completion: find date_anchor/both dependencies, resolve due dates (completedAt + offsetDays), cascade to downstream. On reopen: null out dependent due dates, cascade. On delete: clear due dates, remove dependencies, cascade.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 13, '04-task-flow-engine.md', 'Add section status derivation', 'actions', 'database, server-actions',
  'Unit tests pass. Section status computed from task statuses at query time. Progress counts derived correctly.',
  'Compute section status: all completed → completed, any in_progress → in_progress, else → not_started. Add progress counts (completed_count, total_count) to section queries. Never store status.');

-- Dependencies for 04-task-flow-engine
INSERT INTO task_dependencies VALUES ('moxo-v1', 11, 'moxo-v1', 6);   -- completion needs unlock logic
INSERT INTO task_dependencies VALUES ('moxo-v1', 11, 'moxo-v1', 14);  -- completion needs assignee service
INSERT INTO task_dependencies VALUES ('moxo-v1', 12, 'moxo-v1', 11);  -- cascading depends on completion
INSERT INTO task_dependencies VALUES ('moxo-v1', 12, 'moxo-v1', 5);   -- cascading needs dependency service
INSERT INTO task_dependencies VALUES ('moxo-v1', 13, 'moxo-v1', 11);  -- section status depends on completion

-- =====================
-- 05-assignees-invitations.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 14, '05-assignees-invitations.md', 'Create workspace member service with role management', 'actions', 'database, server-actions',
  'Unit tests pass. Add/remove members works. Role updates work. Unique constraint enforced.',
  'Build WorkspaceMember service. Include: add member with role, remove member, update role, get members for workspace. Roles: admin, account_manager, user. Enforce unique (workspaceId, userId) constraint.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 15, '05-assignees-invitations.md', 'Create task assignee service with validation', 'actions', 'database, server-actions',
  'Unit tests pass. Assignees must be workspace members. Duplicate assignment rejected.',
  'Build TaskAssignee service. Include: assign user to task, unassign, get assignees for task. Validate: user must be member of task workspace. Reject duplicate assignments.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 16, '05-assignees-invitations.md', 'Create invitation service with token generation and redemption', 'actions', 'database, server-actions',
  'Unit tests pass. Token generated, email sent via Resend. Signup with valid token creates member. Expired tokens rejected.',
  'Build PendingInvitation service. Include: create invitation (generate token, set 72hr expiry, send email via Resend), redeem invitation (validate token, create member, delete invitation). Reject expired tokens.');

-- Dependencies for 05-assignees-invitations
INSERT INTO task_dependencies VALUES ('moxo-v1', 14, 'moxo-v1', 1);   -- members need workspace service
INSERT INTO task_dependencies VALUES ('moxo-v1', 15, 'moxo-v1', 14);  -- assignees need member service
INSERT INTO task_dependencies VALUES ('moxo-v1', 15, 'moxo-v1', 3);   -- assignees need task service
INSERT INTO task_dependencies VALUES ('moxo-v1', 16, 'moxo-v1', 14);  -- invitations need member service

-- =====================
-- 06-audit-log.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 17, '06-audit-log.md', 'Create Moxo audit_log_entry table migration', 'database', 'database',
  'Migration runs. Table has workspace_id, task_id, event_type, actor_id, metadata (JSONB), source, created_at.',
  'Create new migration for moxo_audit_log_entry table (separate from auth audit_log). Columns: id, workspace_id (FK), task_id (FK nullable), event_type, actor_id (FK), metadata (JSONB), source, ip_address, created_at. Immutable (no updatedAt).');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 18, '06-audit-log.md', 'Create audit log service with event taxonomy', 'actions', 'database, server-actions',
  'Unit tests pass. logEvent() writes to table. All event types defined. Metadata serialized correctly.',
  'Build AuditLog service. logEvent(workspaceId, eventType, actorId, metadata, taskId?). Event types: task.created, task.completed, task.reopened, file.uploaded, approval.approved, etc. Source: internal, signnow, calendly.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 19, '06-audit-log.md', 'Wire audit logging into workspace, task, and member operations', 'actions', 'database, server-actions',
  'Integration tests pass. Create/update/delete operations write audit entries.',
  'Add audit logging calls to workspace, section, task, and member services. Log: creation, updates (with changed fields in metadata), soft-deletes, membership changes.');

-- Dependencies for 06-audit-log
INSERT INTO task_dependencies VALUES ('moxo-v1', 18, 'moxo-v1', 17);  -- service needs table
INSERT INTO task_dependencies VALUES ('moxo-v1', 19, 'moxo-v1', 18);  -- wiring needs service
INSERT INTO task_dependencies VALUES ('moxo-v1', 19, 'moxo-v1', 4);   -- wiring needs CRUD routes

-- =====================
-- 07-notifications.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 20, '07-notifications.md', 'Create notification trigger service', 'actions', 'server-actions',
  'Unit tests pass (mocked Knock). triggerWorkflow() calls Knock API. All 12 workflow types supported.',
  'Build NotificationService wrapping Knock. triggerWorkflow(workflowId, recipientId, data). Support 12 workflows: task-assigned, task-your-turn, due-date-approaching, due-date-passed, approval-requested, approval-rejected, esign-ready, file-ready-for-review, file-rejected, meeting-starting, comment-added, due-date-cleared.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 21, '07-notifications.md', 'Wire notification triggers into task flow events', 'actions', 'server-actions',
  'Integration tests pass. Task assignment, completion, your-turn, approval-requested all trigger notifications.',
  'Call NotificationService from task flow operations. On assign: task-assigned. On completion: task-your-turn to next task assignees. On approval task activate: approval-requested. On comment: comment-added.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 22, '07-notifications.md', 'Create due date reminder scheduler (cron job)', 'infra', 'infra, server-actions',
  'Cron runs on schedule. Finds approaching/overdue tasks. Triggers Knock workflows. Deduplication via Knock.',
  'Create Next.js cron route or Vercel cron. Query tasks with due dates within 24 hours or overdue. Trigger due-date-approaching or due-date-passed. Include deduplication key: taskId-eventType-date.');

-- Dependencies for 07-notifications
INSERT INTO task_dependencies VALUES ('moxo-v1', 21, 'moxo-v1', 20);  -- wiring needs trigger service
INSERT INTO task_dependencies VALUES ('moxo-v1', 21, 'moxo-v1', 11);  -- wiring needs task flow
INSERT INTO task_dependencies VALUES ('moxo-v1', 22, 'moxo-v1', 20);  -- cron needs trigger service

-- =====================
-- 08-form-builder.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 23, '08-form-builder.md', 'Add dnd-kit to design package and create sortable list component', 'frontend', 'react-components',
  'Package installed. Reusable SortableList component works. Unit tests pass.',
  'Install @dnd-kit/core and @dnd-kit/sortable in packages/design. Create SortableList component that handles drag-and-drop reordering. Export from design package.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 24, '08-form-builder.md', 'Create form builder canvas with drag-and-drop', 'frontend', 'react-components',
  'Elements can be dragged from palette to canvas. Reordering works. Multi-page tabs work.',
  'Build FormBuilder component. Element palette sidebar with 14 types. Canvas using SortableList. Multi-page support via tabs. Dragging from palette adds to canvas. Reordering updates positions.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 25, '08-form-builder.md', 'Create element property editor sidebar', 'frontend', 'react-components',
  'Selecting element shows property form. Changes update element config. Validation rules configurable.',
  'Build ElementPropertyEditor component. Shows when element selected. Edit: label, placeholder, helpText, required, options (for select/radio/checkbox), validation rules. Uses shadcn form components.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 26, '08-form-builder.md', 'Wire form builder to API with auto-save', 'frontend', 'react-components, server-actions',
  'Form config saves on 500ms debounce. Full replace in transaction. Loading existing form populates builder.',
  'Connect FormBuilder to form config API. Auto-save on 500ms debounce. Save as full replace (not incremental). Load existing config on mount. Show save status indicator.');

-- Dependencies for 08-form-builder
INSERT INTO task_dependencies VALUES ('moxo-v1', 24, 'moxo-v1', 23);  -- canvas needs sortable
INSERT INTO task_dependencies VALUES ('moxo-v1', 25, 'moxo-v1', 24);  -- editor needs canvas
INSERT INTO task_dependencies VALUES ('moxo-v1', 26, 'moxo-v1', 25);  -- wiring needs editor
INSERT INTO task_dependencies VALUES ('moxo-v1', 26, 'moxo-v1', 10);  -- wiring needs form element service

-- =====================
-- 09-form-submissions.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 27, '09-form-submissions.md', 'Create form renderer that maps FormElement to shadcn inputs', 'frontend', 'react-components',
  'All 14 element types render correctly. Validation rules applied via react-hook-form register.',
  'Build FormRenderer component. Map element types to shadcn: single_line_text→Input, multiline_text→Textarea, single_selection→RadioGroup, multi_selection→Checkbox group, dropdown→Select. Apply validation from element.validation to register().');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 28, '09-form-submissions.md', 'Add draft saving with auto-save on debounce', 'frontend', 'react-components, server-actions',
  'Drafts save every 500ms. Returning to form loads draft. Status = draft until submit.',
  'Add draft saving to FormRenderer. Create FormSubmission with status=draft on first change. Auto-save field responses on 500ms debounce. Load draft on mount if exists.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 29, '09-form-submissions.md', 'Create submission API with server-side validation', 'actions', 'server-actions',
  'Zod validates all fields. Invalid submissions rejected. Valid submissions create records and trigger task completion.',
  'Build form submission endpoint. Re-validate with Zod on server (dont trust client). Create FormSubmission + FormFieldResponse records. Set status=submitted, submittedAt. Call task completion service.');

-- Dependencies for 09-form-submissions
INSERT INTO task_dependencies VALUES ('moxo-v1', 27, 'moxo-v1', 10);  -- renderer needs element schema
INSERT INTO task_dependencies VALUES ('moxo-v1', 28, 'moxo-v1', 27);  -- draft needs renderer
INSERT INTO task_dependencies VALUES ('moxo-v1', 29, 'moxo-v1', 28);  -- submission needs draft
INSERT INTO task_dependencies VALUES ('moxo-v1', 29, 'moxo-v1', 11);  -- submission triggers completion

-- =====================
-- 10-file-system.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 30, '10-file-system.md', 'Create file upload service with presigned URLs', 'actions', 'server-actions',
  'Unit tests pass. Presigned URL generated. Upload confirmation creates File record.',
  'Build FileService. getPresignedUploadUrl(filename, mimeType) returns presigned URL. confirmUpload(key, workspaceId, sourceType, sourceTaskId?) creates File record. Use S3 client from storage package.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 31, '10-file-system.md', 'Add thumbnail generation with sharp', 'actions', 'server-actions',
  'Images resized to thumbnail. PDFs have first page converted. Thumbnail uploaded to storage. thumbnailKey populated.',
  'Install sharp. On confirmUpload, async generate thumbnail: images resize to 200x200, PDFs convert first page. Upload thumbnail to storage. Update File.thumbnailKey. Handle failures gracefully (file still valid without thumbnail).');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 32, '10-file-system.md', 'Add file versioning support', 'actions', 'server-actions',
  'Replacing file creates new record with previous_version_id. Version history query works by walking chain.',
  'Add replaceFile(fileId, newStorageKey) that creates new File with previous_version_id pointing to old file. Add getVersionHistory(fileId) that walks previous_version_id chain.');

-- Dependencies for 10-file-system
INSERT INTO task_dependencies VALUES ('moxo-v1', 30, 'moxo-v1', 1);   -- file service needs workspace
INSERT INTO task_dependencies VALUES ('moxo-v1', 31, 'moxo-v1', 30);  -- thumbnail needs file service
INSERT INTO task_dependencies VALUES ('moxo-v1', 32, 'moxo-v1', 30);  -- versioning needs file service

-- =====================
-- 11-realtime-chat.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 33, '11-realtime-chat.md', 'Create Ably channel service with workspace scoping', 'actions', 'server-actions',
  'Channel names follow convention. Token auth ensures only members can subscribe. Events broadcast correctly.',
  'Build AblyService wrapping packages/realtime. Channel naming: workspace:{id}, workspace:{id}:chat, user:{id}. Token auth callback validates workspace membership. broadcast(channel, event, data) publishes.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 34, '11-realtime-chat.md', 'Wire real-time broadcasts into task and section operations', 'actions', 'server-actions',
  'Task create/update/delete broadcasts events. Section status changes broadcast. Members can subscribe and receive updates.',
  'Call AblyService.broadcast from task and section services. Events: task.created, task.updated, task.deleted, section.statusChanged. Include relevant data in payload. Frontend can subscribe for live updates.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 35, '11-realtime-chat.md', 'Create chat service with message types and pagination', 'actions', 'database, server-actions',
  'Unit tests pass. Text, annotation, system messages work. Cursor-based pagination works. Attachments link correctly.',
  'Build ChatService. sendMessage(workspaceId, userId, content, type, attachments?, referencedTaskId?, referencedDocumentId?). getMessages(workspaceId, cursor?, limit). Message types: text, annotation, system. Broadcast new messages via Ably.');

-- Dependencies for 11-realtime-chat
INSERT INTO task_dependencies VALUES ('moxo-v1', 33, 'moxo-v1', 14);  -- Ably needs membership for auth
INSERT INTO task_dependencies VALUES ('moxo-v1', 34, 'moxo-v1', 33);  -- wiring needs Ably service
INSERT INTO task_dependencies VALUES ('moxo-v1', 34, 'moxo-v1', 4);   -- wiring needs CRUD routes
INSERT INTO task_dependencies VALUES ('moxo-v1', 35, 'moxo-v1', 33);  -- chat needs Ably service

-- =====================
-- 12-signnow-integration.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 36, '12-signnow-integration.md', 'Add SignNow SDK and create document push service', 'actions', 'server-actions',
  'SDK installed. Document uploaded to SignNow. Document ID and signing URL stored in ESignConfig.',
  'Install SignNow SDK. Build SignNowService. pushDocument(fileId, signerEmail) uploads to SignNow, configures signer, returns documentId and signingUrl. Update ESignConfig with provider details.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 37, '12-signnow-integration.md', 'Create SignNow webhook handler', 'actions', 'server-actions',
  'Svix receives and validates webhook. Handler finds matching task. Completion updates ESignConfig and triggers task completion.',
  'Create webhook endpoint for SignNow events via Svix. On document.completed: find ESignConfig by providerDocumentId, update status=completed, store completedDocumentUrl, call task completion service.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 38, '12-signnow-integration.md', 'Wire e-sign events to audit log', 'actions', 'server-actions',
  'All SignNow events written to audit log with source=signnow. Document sent, viewed, signed events tracked.',
  'In webhook handler and pushDocument, call AuditLog.logEvent with source=signnow. Events: esign.sent, esign.viewed, esign.completed. Include document metadata.');

-- Dependencies for 12-signnow-integration
INSERT INTO task_dependencies VALUES ('moxo-v1', 36, 'moxo-v1', 8);   -- needs ESignConfig service
INSERT INTO task_dependencies VALUES ('moxo-v1', 36, 'moxo-v1', 30);  -- needs file service for upload
INSERT INTO task_dependencies VALUES ('moxo-v1', 37, 'moxo-v1', 36);  -- webhook needs push service
INSERT INTO task_dependencies VALUES ('moxo-v1', 37, 'moxo-v1', 11);  -- webhook triggers completion
INSERT INTO task_dependencies VALUES ('moxo-v1', 38, 'moxo-v1', 37);  -- audit wiring needs webhook
INSERT INTO task_dependencies VALUES ('moxo-v1', 38, 'moxo-v1', 18);  -- audit wiring needs audit service

-- =====================
-- 13-google-integration.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 39, '13-google-integration.md', 'Add Google APIs package and create OAuth flow', 'infra', 'infra, server-actions',
  'Package installed. OAuth consent screen works. Refresh token stored encrypted. Token refresh works.',
  'Install googleapis package. Create OAuth callback route. Store refresh token encrypted in database (workspace-level). Implement token refresh on expiry. Scopes: calendar.events, calendar.readonly.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 40, '13-google-integration.md', 'Create calendar service for event creation with Meet links', 'actions', 'server-actions',
  'Unit tests pass (mocked API). Event created with auto-generated Meet link. Booking record updated with calendarEventId and meetLink.',
  'Build GoogleCalendarService. createEvent(workspaceId, title, startTime, endTime, attendees) creates calendar event with conferenceData for Meet link. Update Booking record with calendarEventId and meetLink.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 41, '13-google-integration.md', 'Create meeting list query for workspace', 'actions', 'server-actions',
  'Queries Calendar API for workspace member events. Returns upcoming meetings. Handles pagination.',
  'Build getMeetings(workspaceId). Query Calendar API for events matching workspace members. Filter to upcoming meetings. Paginate with page tokens. Return meeting list with Meet links.');

-- Dependencies for 13-google-integration
INSERT INTO task_dependencies VALUES ('moxo-v1', 40, 'moxo-v1', 39);  -- calendar needs OAuth
INSERT INTO task_dependencies VALUES ('moxo-v1', 40, 'moxo-v1', 8);   -- calendar updates Booking via config
INSERT INTO task_dependencies VALUES ('moxo-v1', 41, 'moxo-v1', 40);  -- list needs calendar service

-- =====================
-- 14-ui-layout.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 42, '14-ui-layout.md', 'Create three-panel layout with resizable panels', 'frontend', 'react-components',
  'Desktop shows 3 columns. Panels resize correctly. State persists across navigation.',
  'Build MoxoLayout component using react-resizable-panels. Left: workspace sidebar. Center: main content (tabs for Flow/Files). Right: activity/chat/details. Persist panel sizes in localStorage.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 43, '14-ui-layout.md', 'Create workspace list sidebar with navigation', 'frontend', 'react-components',
  'Workspaces listed with status indicators. Clicking navigates to workspace. Create workspace button works.',
  'Build WorkspaceSidebar component. List workspaces with name and progress indicator. Click navigates. Create button opens modal. Use shadcn components.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 44, '14-ui-layout.md', 'Create activity feed panel with audit log display', 'frontend', 'react-components',
  'Activity feed shows audit entries. Perspective-aware phrasing (You vs name). Pagination works.',
  'Build ActivityFeed component. Fetch audit log entries for workspace. Display with timestamps. Use perspective-aware phrasing: "You completed X" vs "John completed X". Load more on scroll.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 45, '14-ui-layout.md', 'Add responsive breakpoints with drawer fallbacks', 'frontend', 'react-components',
  'Tablet: 2 columns, sidebar as drawer. Mobile: 1 column, bottom tabs, right panel as full-screen drawer.',
  'Add responsive behavior to MoxoLayout. Tablet (768-1023px): sidebar becomes vaul drawer, right panel collapsible. Mobile (<768px): single column, bottom tab nav, right panel as full-screen drawer.');

-- Dependencies for 14-ui-layout
INSERT INTO task_dependencies VALUES ('moxo-v1', 43, 'moxo-v1', 42);  -- sidebar goes in layout
INSERT INTO task_dependencies VALUES ('moxo-v1', 44, 'moxo-v1', 42);  -- activity goes in layout
INSERT INTO task_dependencies VALUES ('moxo-v1', 44, 'moxo-v1', 18);  -- activity needs audit service
INSERT INTO task_dependencies VALUES ('moxo-v1', 45, 'moxo-v1', 42);  -- responsive modifies layout

-- =====================
-- 15-task-ui-components.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 46, '15-task-ui-components.md', 'Create TaskCard component with type-specific styling', 'frontend', 'react-components',
  'Renders all 6 task types. Step badge (checkmark/number/lock). Type icon color-coded. Assignee avatars. Action button.',
  'Build TaskCard component. Props: task, onAction. Show step badge: completed=checkmark, locked=lock, else=number. Type icon with color. Assignee avatar initials. Primary action button varies by type.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 47, '15-task-ui-components.md', 'Create SectionHeader with collapse and progress', 'frontend', 'react-components',
  'Collapsible sections. Progress badge shows X/Y completed. Admin actions in dropdown menu.',
  'Build SectionHeader component using shadcn Collapsible. Show title, progress badge (3/5 tasks), chevron toggle. Admin dropdown: edit, delete, reorder. Children are TaskCards.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 48, '15-task-ui-components.md', 'Create Timeline connector and flow view', 'frontend', 'react-components',
  'Vertical line with step badges connects TaskCards. Visual distinction for locked/unlocked/completed.',
  'Build Timeline component. Vertical line connecting TaskCards. Step badges on line. Visual states: locked (gray), unlocked (blue), in_progress (yellow), completed (green). Use with SectionHeader and TaskCard.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 49, '15-task-ui-components.md', 'Create ActionDetailsPanel for task details', 'frontend', 'react-components',
  'Slide-over on desktop, drawer on mobile. Shows full task context. Type-specific content renders. Comments and activity log.',
  'Build ActionDetailsPanel component. Desktop: slide-over in right panel. Mobile: vaul drawer. Content: task details, type-specific view (form, approval buttons, upload zone), comments textarea, activity log section.');

-- Dependencies for 15-task-ui-components
INSERT INTO task_dependencies VALUES ('moxo-v1', 47, 'moxo-v1', 46);  -- section uses TaskCard
INSERT INTO task_dependencies VALUES ('moxo-v1', 48, 'moxo-v1', 47);  -- timeline uses section
INSERT INTO task_dependencies VALUES ('moxo-v1', 49, 'moxo-v1', 46);  -- details shows task

-- =====================
-- 16-api-middleware.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 50, '16-api-middleware.md', 'Create workspace middleware that verifies membership and attaches role', 'actions', 'server-actions',
  'Middleware validates user is workspace member. Attaches member role to request context. Non-members get 403.',
  'Build withWorkspace middleware. Extract workspaceId from request. Query WorkspaceMember for current user. Attach role to context. Return 403 if not member.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 51, '16-api-middleware.md', 'Create role middleware for permission checking', 'actions', 'server-actions',
  'Middleware checks user role meets minimum required. Admin-only routes reject non-admins. Role hierarchy: admin > account_manager > user.',
  'Build withRole(minimumRole) middleware. Check context.role >= minimumRole. Role hierarchy: admin (all), account_manager (manage tasks), user (own tasks only). Return 403 if insufficient.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 52, '16-api-middleware.md', 'Standardize API error responses', 'actions', 'server-actions',
  'All errors follow consistent format. Status codes correct. Error messages helpful but dont leak internals.',
  'Create error handling utilities. Consistent format: { error: string, code: string, details?: object }. Proper status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 500 (internal). Sanitize internal errors.');

-- Dependencies for 16-api-middleware
INSERT INTO task_dependencies VALUES ('moxo-v1', 50, 'moxo-v1', 14);  -- workspace middleware needs member service
INSERT INTO task_dependencies VALUES ('moxo-v1', 51, 'moxo-v1', 50);  -- role middleware needs workspace middleware
INSERT INTO task_dependencies VALUES ('moxo-v1', 52, 'moxo-v1', 4);   -- errors apply to routes

-- =====================
-- 99-e2e-verification.md
-- =====================

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 53, '99-e2e-verification.md', 'E2E: Workspace and task management flow', 'e2e', 'testing-e2e',
  'Create workspace, add sections, add tasks, reorder, complete task, verify section progress.',
  'Playwright test: create workspace, add 2 sections, add tasks to each, reorder tasks, complete one task, verify section progress updates, verify activity feed shows events.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 54, '99-e2e-verification.md', 'E2E: Form builder and submission flow', 'e2e', 'testing-e2e',
  'Create form task, build form with elements, submit as assignee, verify completion.',
  'Playwright test: create FORM task, open builder, add text/select/checkbox elements, save, switch to assignee view, fill form, submit, verify task completes.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 55, '99-e2e-verification.md', 'E2E: Invitation and authentication flow', 'e2e', 'testing-e2e',
  'Admin invites user, user receives email, signs up, joins workspace, sees assigned tasks.',
  'Playwright test: admin invites email, intercept email (mock), user clicks link, signs up, redirected to workspace, sees assigned tasks.');

INSERT INTO tasks (sprint, task_num, spec, title, type, skills, done_when, description) VALUES
('moxo-v1', 56, '99-e2e-verification.md', 'E2E: File upload and approval flow', 'e2e', 'testing-e2e',
  'Create file request task, upload file, create approval task, approve, verify completion chain.',
  'Playwright test: create FILE_REQUEST task, create APPROVAL task dependent on it, upload file as assignee, approve as admin, verify both tasks complete.');

-- E2E depends on all implementation tasks
INSERT INTO task_dependencies VALUES ('moxo-v1', 53, 'moxo-v1', 52);
INSERT INTO task_dependencies VALUES ('moxo-v1', 54, 'moxo-v1', 52);
INSERT INTO task_dependencies VALUES ('moxo-v1', 55, 'moxo-v1', 52);
INSERT INTO task_dependencies VALUES ('moxo-v1', 56, 'moxo-v1', 52);
INSERT INTO task_dependencies VALUES ('moxo-v1', 53, 'moxo-v1', 49);
INSERT INTO task_dependencies VALUES ('moxo-v1', 54, 'moxo-v1', 29);
INSERT INTO task_dependencies VALUES ('moxo-v1', 55, 'moxo-v1', 16);
INSERT INTO task_dependencies VALUES ('moxo-v1', 56, 'moxo-v1', 32);
