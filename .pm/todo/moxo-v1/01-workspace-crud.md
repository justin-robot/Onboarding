# Workspace, Section, Task CRUD

**Status**: Not Started

---

## Scope

Core CRUD operations for workspaces, sections, and tasks. This is the foundation that all other features build on.

**This spec covers**:
- Workspace create, read, update, soft-delete
- Section create, read, update, soft-delete with position management
- Task create, read, update, soft-delete with position management
- Nested queries (workspace → sections → tasks)

**Out of scope**:
- Task dependencies → `02-task-dependencies.md`
- Task type-specific configs → `03-task-type-configs.md`
- Task completion logic → `04-task-flow-engine.md`
- Assignee management → `05-assignees-invitations.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database tables (migrations) | ✅ |
| Kysely types (schemas/main.ts) | ✅ |
| API routes | ⏳ |
| Service layer | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create workspace service with CRUD operations | actions | Unit tests pass for create, read, update, soft-delete. Workspace with sections/tasks returns nested structure. |
| 2 | Create section service with CRUD + position management | actions | Unit tests pass. Reordering updates positions correctly. Sections return with tasks nested. |
| 3 | Create task service with CRUD + position management | actions | Unit tests pass. Reordering works within section. Moving between sections works. |
| 4 | Create API routes for workspace, section, task | actions | Integration tests pass. Routes follow REST conventions. Proper error handling. |

---

## Technical Notes

- All services use Kysely for type-safe queries
- Soft deletes via `deletedAt` timestamp — queries filter `WHERE deletedAt IS NULL`
- Position management: reordering sends array of IDs, backend updates positions in transaction
- Workspace GET returns full nested structure with computed section progress

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Workspace, Section, and Task CRUD section)
- Data model: `docs/moxo-data-model-final-v2.md` (Core Models section)
- Database schema: `packages/database/migrations/20250204120000_moxo_core.ts`
