# Task Dependencies

**Status**: Not Started

---

## Scope

Task dependency graph for unlock behavior and relative due dates.

**This spec covers**:
- TaskDependency CRUD
- Circular dependency detection and prevention
- Dependency resolution (is task unlocked?)
- Due date anchor relationships

**Out of scope**:
- Due date cascading on completion → `04-task-flow-engine.md`
- Task completion logic → `04-task-flow-engine.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database table (task_dependency) | ✅ |
| Kysely types | ✅ |
| Dependency service | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create dependency service with CRUD and circular detection | actions | Unit tests pass. Circular dependencies rejected with error. Chain walking works for deep graphs. |
| 2 | Add unlock resolution logic | actions | Unit tests pass. `isTaskUnlocked(taskId)` returns correct boolean. Handles multi-dependency cases (all must complete). |
| 3 | Wire dependency checks into task queries | actions | Tasks include `locked` boolean in API responses. Derived at query time, never stored. |

---

## Technical Notes

- Dependency types: `unlock`, `date_anchor`, `both`
- Circular detection: Walk dependency chain recursively, reject if task appears in its own chain
- A task is unlocked when ALL its `unlock` or `both` dependencies are completed
- Sequential sections: When admin enables "sequential", auto-generate unlock dependencies between consecutive tasks

---

## References

- Data model: `docs/moxo-data-model-final-v2.md` (TaskDependency section)
- Technical spec: `docs/moxo-technical-spec-final.md` (Task Flow Engine section)
