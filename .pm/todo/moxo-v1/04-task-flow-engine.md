# Task Flow Engine

**Status**: Not Started

---

## Scope

Core task completion logic, status transitions, and due date cascading.

**This spec covers**:
- Task completion (any vs all assignees)
- Assignee completion tracking
- Section status derivation
- Due date resolution and cascading
- Task reopening with cascade effects

**Out of scope**:
- Dependency graph management → `02-task-dependencies.md`
- Notifications on completion → `07-notifications.md`
- Real-time broadcasting → `11-realtime-chat.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database tables | ✅ |
| Kysely types | ✅ |
| Flow engine | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create task completion service | actions | Unit tests pass. "any" rule completes on first assignee. "all" rule requires every assignee. Status transitions correctly. |
| 2 | Add due date cascading on task events | actions | Unit tests pass. Completion resolves dependent due dates. Reopen nulls them. Delete clears and notifies. Recursive cascading works. |
| 3 | Add section status derivation | actions | Unit tests pass. Section status computed from task statuses at query time. Progress counts derived correctly. |

---

## Technical Notes

- Completion rule is on Task, not config
- When task completes: resolve dependent due dates, unlock next tasks, update section status
- Due date resolution: `anchor.completedAt + dependency.offsetDays`
- Section status: all completed → completed, any in_progress → in_progress, else → not_started
- Reopening a task: reset all assignee statuses, cascade unresolve due dates

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Task Flow Engine section)
- Data model: `docs/moxo-data-model-final-v2.md` (DueDate, TaskDependency sections)
