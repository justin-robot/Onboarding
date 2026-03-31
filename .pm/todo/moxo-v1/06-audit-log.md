# Audit Log Service

**Status**: Not Started

---

## Scope

Centralized audit logging for all significant actions.

**This spec covers**:
- AuditLogEntry creation service
- Event type taxonomy
- Workspace-scoped activity queries
- Integration points for all modules

**Out of scope**:
- Activity feed UI → `14-ui-layout.md`
- Real-time broadcasting of audit events → `11-realtime-chat.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database table (audit_log in auth) | ✅ (but needs Moxo-specific table) |
| Kysely types | ⏳ (need Moxo audit table) |
| Audit service | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create Moxo audit_log_entry table migration | database | Migration runs. Table has workspace_id, task_id, event_type, actor_id, metadata (JSONB), source, created_at. |
| 2 | Create audit log service with event taxonomy | actions | Unit tests pass. logEvent() writes to table. All event types defined. Metadata serialized correctly. |
| 3 | Wire audit logging into workspace, task, and member operations | actions | Integration tests pass. Create/update/delete operations write audit entries. |

---

## Technical Notes

- Immutable, append-only table (no updates or deletes)
- Event types: task.created, task.completed, task.reopened, file.uploaded, approval.approved, etc.
- Source: internal, signnow, calendly, etc.
- Metadata is JSONB for event-specific details
- Query by workspace + date range for activity feed

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Audit Log section)
- Data model: `docs/moxo-data-model-final-v2.md` (AuditLogEntry)
