# Moxo — Data Model (Final v2)

> Revised February 2, 2026. Changes from v1:
> - **Added** TaskDependency model (replaces positional unlocking + due date anchoring)
> - **Simplified** DueDate (anchor reference moved to TaskDependency)
> - **Removed** FileRequestUploader (status derived from existing models)
> - **Removed** FileRequestReviewer (use Approval tasks instead)
> - **Simplified** FileRequestConfig (require_review removed)
> - **Added** Reminder model (was referenced in spec but missing)
>
> Net result: 27 models → 25 models

---

## Entity Relationship Overview

```
Workspace
 ├── has many → WorkspaceMember (→ User, with role)
 ├── has many → Section (ordered by position)
 │                └── has many → Task (ordered by position)
 │                                 ├── has many → TaskAssignee (→ User)
 │                                 ├── has many → TaskDependency (→ Task)
 │                                 ├── has one  → DueDate (embedded)
 │                                 ├── has one  → type_specific_config (polymorphic)
 │                                 ├── has many → Attachment (→ File)
 │                                 └── has many → Comment
 ├── has many → Message
 ├── has many → File
 ├── has many → AuditLogEntry
 ├── has many → Notification
 └── has many → Reminder
```

---

## Core Models

### Workspace

```
Workspace
├── id                  UUID, primary key
├── name                string, required
├── description         string, optional
├── due_date            datetime, optional
├── created_at          datetime
└── updated_at          datetime

Relations:
├── members[]           → WorkspaceMember
├── sections[]          → Section
├── messages[]          → Message
├── files[]             → File
├── audit_log[]         → AuditLogEntry
├── notifications[]     → Notification
└── reminders[]         → Reminder
```

---

### WorkspaceMember

```
WorkspaceMember
├── id                  UUID, primary key
├── workspace_id        → Workspace
├── user_id             → User
├── role                enum: "admin" | "account_manager" | "user"
├── created_at          datetime
└── updated_at          datetime

Unique constraint: (workspace_id, user_id)
```

---

### User

```
User
├── id                  UUID, primary key
├── name                string, required
├── email               string, required, unique
├── phone               string, optional
├── role                enum: "admin" | "account_manager" | "user"
├── created_at          datetime
└── updated_at          datetime

Notes:
- Avatar initials derived from name at render time (not stored)
- Account created via invitation (not shareable links)
```

---

### Section

```
Section
├── id                  UUID, primary key
├── workspace_id        → Workspace
├── title               string, required
├── position            integer (ordering within workspace)
├── status              enum: "not_started" | "in_progress" | "completed"
├── created_at          datetime
└── updated_at          datetime

Relations:
└── tasks[]             → Task (ordered by position)

Progress (derived):
- completed_count = COUNT(tasks WHERE status = "completed")
- total_count = COUNT(tasks)
- Computed at query time, never stored
```

---

### Task

```
Task
├── id                  UUID, primary key
├── section_id          → Section
├── title               string, required
├── description         string, optional
├── position            integer (display order within section)
├── type                enum: FORM | ACKNOWLEDGEMENT | TIME_BOOKING
│                             | E_SIGN | FILE_REQUEST | APPROVAL
├── status              enum: "not_started" | "in_progress" | "completed"
├── due_date            → DueDate (embedded, see below)
├── completion_rule     enum: "any" | "all"
├── created_at          datetime
└── updated_at          datetime

Relations:
├── assignees[]         → TaskAssignee
├── dependencies[]      → TaskDependency (tasks this task depends on)
├── dependents[]        → TaskDependency (tasks that depend on this task)
├── type_config         → polymorphic (one of the type-specific configs)
├── attachments[]       → File
└── comments[]          → Comment

Notes:
- Position controls display order only (not unlocking — see TaskDependency)
- completion_rule: "any" = first assignee to complete finishes the task
                   "all" = every assignee must complete
- Task unlocking is governed by TaskDependency, not position
```

---

### TaskDependency (NEW)

```
TaskDependency
├── id                  UUID, primary key
├── task_id             → Task (the dependent task)
├── depends_on_task_id  → Task (the prerequisite task)
├── type                enum: "unlock" | "date_anchor" | "both"
├── offset_days         integer | null (only for date_anchor or both)
├── created_at          datetime

Notes:
- "unlock": task_id cannot start until depends_on_task_id completes
- "date_anchor": task_id's due date is relative to depends_on_task_id
- "both": combines unlock and date_anchor behavior

Circular dependency prevention:
- On save: walk the dependency chain and verify task_id does not
  appear as a transitive dependency of itself
- If circular reference detected: reject the save, show error

Implementation note for v1:
- When admin toggles "sequential" on a section, the system auto-generates
  "unlock" dependencies between consecutive tasks (by position)
- Position field still controls display order
- Cross-section and parallel-path dependencies available at data layer
  for future use without schema migration
```

---

### DueDate (embedded on Task) — SIMPLIFIED

```
DueDate
├── type                enum: "absolute" | "relative"
└── value               datetime | null

Notes:
- For absolute: value is the due date itself, set immediately
- For relative: value starts null, computed when the anchor task
  (defined in TaskDependency with type "date_anchor" or "both") completes

The anchor reference and offset_days now live on TaskDependency,
not on DueDate. This unifies the dependency graph for both unlocking
and date calculation.

Display logic:
- Absolute: show the calendar date
- Relative (resolved): show the computed calendar date
- Relative (unresolved): look up the TaskDependency to show
  "X days after [Task Title]"
- No due date: show nothing

Cascading Behavior (unchanged from v1, but now uses TaskDependency):

  On anchor task COMPLETION:
  1. Find all TaskDependency rows where depends_on_task_id = this task
     and type is "date_anchor" or "both"
  2. For each, resolve the dependent task's due date:
     dependent.due_date.value = this_task.completed_at + dependency.offset_days
  3. Cascade: if any resolved task is itself an anchor for others,
     continue resolving downstream
  4. Check if any newly resolved dates are approaching or overdue
     → trigger notifications

  On anchor task REOPENED:
  1. Find all TaskDependency rows where depends_on_task_id = this task
     and type is "date_anchor" or "both"
  2. Null out the dependent task's due_date.value
  3. Cascade downstream

  On anchor task DELETED:
  1. Find all TaskDependency rows where depends_on_task_id = this task
  2. Delete those dependency rows
  3. For date dependencies: clear the dependent task's due_date entirely
  4. Notify workspace admins that due dates were removed
  5. Cascade downstream
```

---

### TaskAssignee

```
TaskAssignee
├── id                  UUID, primary key
├── task_id             → Task
├── user_id             → User
├── status              enum: "pending" | "completed"
├── completed_at        datetime, optional
├── created_at          datetime
└── updated_at          datetime
```

---

### Comment

```
Comment
├── id                  UUID, primary key
├── task_id             → Task
├── user_id             → User
├── content             string, required
├── created_at          datetime
└── updated_at          datetime
```

---

### Message

```
Message
├── id                  UUID, primary key
├── workspace_id        → Workspace
├── sender_id           → User
├── type                enum: "text" | "annotation" | "system"
├── content             string, required
├── referenced_document_id  → File | null
├── referenced_task_id      → Task | null
├── created_at          datetime
└── updated_at          datetime

Relations:
└── attachments[]       → File
```

---

### File

```
File
├── id                  UUID, primary key
├── workspace_id        → Workspace
├── filename            string, required
├── size                integer (bytes)
├── mime_type           string
├── source_type         enum: "upload" | "task_attachment" | "chat"
├── source_task_id      → Task | null
├── source_message_id   → Message | null
├── thumbnail_url       string, optional
├── uploaded_by         → User
├── version             integer, default 1
├── previous_version_id → File | null
├── created_at          datetime
└── updated_at          datetime

Notes:
- Thumbnails generated async for images, PDFs, documents
- Replacing a file creates a new File record linked via
  previous_version_id (linked list for version history)
- source_task_id + uploaded_by used to derive upload status
  for File Request tasks (see FileRequestConfig notes)
```

---

### AuditLogEntry

```
AuditLogEntry
├── id                  UUID, primary key
├── workspace_id        → Workspace
├── task_id             → Task | null
├── event_type          string
│                       examples:
│                         "task.created"
│                         "task.assigned"
│                         "task.completed"
│                         "task.reopened"
│                         "esign.sent"
│                         "esign.completed"
│                         "file.uploaded"
│                         "approval.approved"
│                         "approval.rejected"
│                         "due_date.resolved"
│                         "due_date.cleared"
│                         "dependency.created"
│                         "dependency.deleted"
├── actor_id            → User
├── metadata            JSON (event-specific details)
├── source              enum: "internal" | "signnow" | "calendly" | etc.
├── ip_address          string, optional
├── created_at          datetime

Notes:
- Immutable, append-only. No updates or deletes.
- Powers the activity sidebar in workspace UI.
- External provider events normalized via webhooks.
```

---

### Notification

```
Notification
├── id                  UUID, primary key
├── workspace_id        → Workspace
├── recipient_id        → User
├── event_type          string (mirrors AuditLogEntry event types)
├── task_id             → Task | null
├── message             string (human-readable notification text)
├── read                boolean, default false
├── channel             enum: "in_app" | "email"
├── delivered_at        datetime, optional
├── created_at          datetime
└── updated_at          datetime

Delivery channels (v1): in_app, email
Delivery channels (v2): sms (deferred)
```

---

### Reminder (NEW)

```
Reminder
├── id                  UUID, primary key
├── workspace_id        → Workspace
├── task_id             → Task | null (null = workspace-level reminder)
├── type                enum: "before_due" | "after_due" | "recurring"
├── offset_minutes      integer | null (for before_due / after_due)
├── recurrence_cron     string | null (for recurring, e.g., "0 9 * * 1")
├── channel             enum: "in_app" | "email"
├── enabled             boolean, default true
├── created_at          datetime
└── updated_at          datetime

Notes:
- "before_due": fires offset_minutes before task due date
- "after_due": fires offset_minutes after task due date (for overdue)
- "recurring": fires on cron schedule (e.g., weekly status reminders)
- Workspace-level reminders (task_id = null) apply default rules
- Task-level reminders override workspace defaults
```

---

## Type-Specific Configs

### FormConfig

```
FormConfig
├── id                  UUID, primary key
├── task_id             → Task (unique)
├── created_at          datetime
└── updated_at          datetime

Relations:
└── pages[]             → FormPage
```

---

### FormPage

```
FormPage
├── id                  UUID, primary key
├── form_config_id      → FormConfig
├── order               integer
├── created_at          datetime
└── updated_at          datetime

Relations:
└── elements[]          → FormElement (ordered by `order`)
```

---

### FormElement

```
FormElement
├── id                  UUID, primary key
├── page_id             → FormPage
├── type                enum (see element types below)
├── order               integer
├── label               string, required
├── placeholder         string, optional
├── help_text           string, optional
├── required            boolean, default false
├── validate            JSON (see validation structure below)
├── options             JSON, optional (for selection types)
├── created_at          datetime
└── updated_at          datetime

Element types:
  Basic:      single_line_text, multiline_text, single_selection,
              multi_selection, dropdown, dynamic_dropdown,
              heading, image, file_upload, paragraph
  Predefined: name, address, email, phone
```

#### Validation Structure (`validate` field)

```
validate: {
  required:       boolean | { value: boolean, message: string }
  minLength:      number  | { value: number,  message: string }
  maxLength:      number  | { value: number,  message: string }
  min:            number  | { value: number,  message: string }
  max:            number  | { value: number,  message: string }
  pattern:        string  | { value: string,  message: string }
}
```

---

### FormSubmission

```
FormSubmission
├── id                  UUID, primary key
├── task_id             → Task
├── submitted_by        → User
├── submitted_at        datetime, optional (null if draft)
├── status              enum: "draft" | "submitted"
├── created_at          datetime
└── updated_at          datetime

Relations:
└── responses[]         → FormFieldResponse
```

---

### FormFieldResponse

```
FormFieldResponse
├── id                  UUID, primary key
├── submission_id       → FormSubmission
├── element_id          → FormElement
├── value               JSON (string | string[] | file_id)
├── created_at          datetime
└── updated_at          datetime
```

---

### AcknowledgementConfig

```
AcknowledgementConfig
├── id                  UUID, primary key
├── task_id             → Task (unique)
├── instructions        string, optional
├── created_at          datetime
└── updated_at          datetime

Relations:
├── acknowledgements[]  → Acknowledgement
└── attachments[]       → File (via task attachments)
```

---

### Acknowledgement

```
Acknowledgement
├── id                  UUID, primary key
├── config_id           → AcknowledgementConfig
├── user_id             → User
├── status              enum: "pending" | "acknowledged"
├── acknowledged_at     datetime, optional
├── created_at          datetime
└── updated_at          datetime
```

---

### TimeBookingConfig

```
TimeBookingConfig
├── id                  UUID, primary key
├── task_id             → Task (unique)
├── booking_link        string (URL to external scheduling tool)
├── created_at          datetime
└── updated_at          datetime

Relations:
└── bookings[]          → Booking
```

---

### Booking

```
Booking
├── id                  UUID, primary key
├── config_id           → TimeBookingConfig
├── user_id             → User
├── status              enum: "not_started" | "booked"
├── calendar_event_id   string, optional
├── meet_link           string, optional
├── booked_at           datetime, optional
├── created_at          datetime
└── updated_at          datetime
```

---

### ESignConfig

```
ESignConfig
├── id                  UUID, primary key
├── task_id             → Task (unique)
├── provider_document_id    string
├── provider_signing_url    string
├── status                  enum: "pending" | "completed"
├── completed_document_url  string, optional
├── created_at          datetime
└── updated_at          datetime

Notes:
- Entire signing flow handled by SignNow
- Moxo tracks done/not-done only
- User clicks "Sign" → redirected to provider
- Provider webhook on completion → update status
```

---

### FileRequestConfig — SIMPLIFIED

```
FileRequestConfig
├── id                  UUID, primary key
├── task_id             → Task (unique)
├── target_folder_id    string, optional
├── created_at          datetime
└── updated_at          datetime

Notes:
- require_review field REMOVED — file review is handled by placing
  a separate Approval task after the File Request in the workflow.
  Use TaskDependency to link them.
- FileRequestUploader model REMOVED — upload status is derived:
  query File where source_task_id = this task, group by uploaded_by,
  join with TaskAssignee to get per-assignee upload status.
- FileRequestReviewer model REMOVED — use Approval tasks instead.
  The Approval task's UI can display files from predecessor tasks.

Deriving upload status at query time:
- For each TaskAssignee on this task:
  - If COUNT(File WHERE source_task_id = task_id AND uploaded_by = user_id) > 0
    → status is "uploaded"
  - Otherwise → status is "pending"

File review workflow (admin setup):
1. Create File Request task (upload only)
2. Create Approval task
3. Create TaskDependency: Approval depends on File Request (type: "unlock")
4. Approval task UI shows files from the predecessor File Request for context
```

---

### ApprovalConfig

```
ApprovalConfig
├── id                  UUID, primary key
├── task_id             → Task (unique)
├── created_at          datetime
└── updated_at          datetime

Relations:
└── approvers[]         → Approver
```

---

### Approver

```
Approver
├── id                  UUID, primary key
├── config_id           → ApprovalConfig
├── user_id             → User
├── status              enum: "pending" | "approved" | "rejected"
├── decided_at          datetime, optional
├── comments            string, optional
├── created_at          datetime
└── updated_at          datetime

Notes:
- Rejection always allows retry (assignee resubmits)
- No sequential ordering for approvers
- Also used to review files when Approval task follows a File Request
```

---

## Enums Reference

```
UserRole:           "admin" | "account_manager" | "user"
TaskType:           FORM | ACKNOWLEDGEMENT | TIME_BOOKING | E_SIGN
                    | FILE_REQUEST | APPROVAL
TaskStatus:         "not_started" | "in_progress" | "completed"
SectionStatus:      "not_started" | "in_progress" | "completed"
CompletionRule:     "any" | "all"
DependencyType:     "unlock" | "date_anchor" | "both"
DueDateType:        "absolute" | "relative"
ReminderType:       "before_due" | "after_due" | "recurring"
MessageType:        "text" | "annotation" | "system"
FileSourceType:     "upload" | "task_attachment" | "chat"
NotificationChannel: "in_app" | "email"
AuditSource:        "internal" | "signnow" | "calendly" | etc.
ESignStatus:        "pending" | "completed"
FormSubmissionStatus: "draft" | "submitted"
AckStatus:          "pending" | "acknowledged"
BookingStatus:      "not_started" | "booked"
ApprovalStatus:     "pending" | "approved" | "rejected"
AssigneeStatus:     "pending" | "completed"
```

---

## Complete Model List

| # | Model | Category | Storage |
|---|-------|----------|---------|
| 1 | Workspace | Core | Table |
| 2 | WorkspaceMember | Core | Table (join) |
| 3 | User | Core | Table |
| 4 | Section | Core | Table |
| 5 | Task | Core | Table |
| 6 | TaskDependency | Core | Table |
| 7 | DueDate | Core | Embedded on Task |
| 8 | TaskAssignee | Core | Table (join) |
| 9 | Comment | Core | Table |
| 10 | Message | Core | Table |
| 11 | File | Core | Table |
| 12 | AuditLogEntry | Core | Table (append-only) |
| 13 | Notification | Core | Table |
| 14 | Reminder | Core | Table |
| 15 | FormConfig | Task: Form | Table |
| 16 | FormPage | Task: Form | Table |
| 17 | FormElement | Task: Form | Table |
| 18 | FormSubmission | Task: Form | Table |
| 19 | FormFieldResponse | Task: Form | Table |
| 20 | AcknowledgementConfig | Task: Acknowledgement | Table |
| 21 | Acknowledgement | Task: Acknowledgement | Table |
| 22 | TimeBookingConfig | Task: Time Booking | Table |
| 23 | Booking | Task: Time Booking | Table |
| 24 | ESignConfig | Task: E-Sign | Table |
| 25 | FileRequestConfig | Task: File Request | Table |
| 26 | ApprovalConfig | Task: Approval | Table |
| 27 | Approver | Task: Approval | Table |

**Total: 25 models** (14 core + 11 task-specific)

Changes from v1:
- **Added:** TaskDependency, Reminder (+2)
- **Removed:** FileRequestUploader, FileRequestReviewer (-2)
- **Simplified:** DueDate (fields moved to TaskDependency), FileRequestConfig (require_review removed)

---

## Technology Decisions Reflected

| Decision | Impact on Data Model |
|----------|---------------------|
| TaskDependency model | Unified dependency graph for both task unlocking and relative due dates. Position field is now display-order only. Enables cross-section dependencies and parallel paths without schema changes. |
| Derived upload status | No FileRequestUploader table. Status computed from File.source_task_id + File.uploaded_by at query time. |
| Approval for file review | No FileRequestReviewer table. File review is a separate Approval task linked via TaskDependency. |
| Task-level completion_rule | Single source of truth. Type-specific configs do not duplicate this field. |
| Reminder model | Supports before_due, after_due, and recurring reminder types at workspace or task level. |
| react-hook-form + dnd-kit | Full table structure for form builder. Validation stored as JSON matching react-hook-form's register API. |
| Section progress derived | No progress field on Section. Computed via COUNT query at read time. |
| SignNow for e-sign | ESignConfig stores only provider reference + done/not-done status. |
| Ably for real-time | No real-time models needed — Ably is infrastructure only. |
| Knock for notifications | Notification model may be simplified further if Knock stores notification state. |
