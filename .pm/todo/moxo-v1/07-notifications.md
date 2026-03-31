# Notifications (Knock Integration)

**Status**: Not Started

---

## Scope

Notification system using Knock for delivery and in-app feed.

**This spec covers**:
- Knock workflow triggers from backend
- Notification table for local tracking (optional, Knock may handle)
- Reminder table and scheduler
- Due date reminder cron job

**Out of scope**:
- Knock dashboard workflow configuration (manual setup)
- Notification bell UI (using Knock React components from codestack)

---

## What's Done

| Item | Status |
|------|--------|
| Knock package configured | ✅ (packages/notifications) |
| Database tables (notification, reminder) | ✅ |
| Knock workflow definitions | ⏳ (need to create in Knock dashboard) |
| Trigger service | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create notification trigger service | actions | Unit tests pass (mocked Knock). triggerWorkflow() calls Knock API. All 12 workflow types supported. |
| 2 | Wire notification triggers into task flow events | actions | Integration tests pass. Task assignment, completion, your-turn, approval-requested all trigger notifications. |
| 3 | Create due date reminder scheduler (cron job) | infra | Cron runs on schedule. Finds approaching/overdue tasks. Triggers Knock workflows. Deduplication via Knock. |

---

## Technical Notes

- 12 Knock workflows to create in dashboard:
  - task-assigned, task-your-turn, due-date-approaching, due-date-passed
  - approval-requested, approval-rejected, esign-ready
  - file-ready-for-review, file-rejected, meeting-starting
  - comment-added, due-date-cleared
- Cron job runs every 15 minutes, checks for due dates within 24 hours
- Deduplication key: `${taskId}-${eventType}-${date}`

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Knock section, Due Date Reminder Scheduler)
- Codestack: `packages/notifications/`
