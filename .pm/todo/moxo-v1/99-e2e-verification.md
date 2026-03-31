# E2E Verification

**Status**: Not Started

---

## Scope

End-to-end verification of the complete Moxo v1 feature set.

**This spec covers**:
- Happy path E2E tests for core workflows
- Integration verification across all features
- Visual regression checks for key UI states

**Out of scope**:
- Edge case testing (handled in component tests)
- Unit testing (handled per feature spec)

---

## What's Done

| Item | Status |
|------|--------|
| Playwright configured | ⏳ (check if in codestack) |
| E2E tests | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | E2E: Workspace and task management flow | e2e | Create workspace, add sections, add tasks, reorder, complete task, verify section progress. |
| 2 | E2E: Form builder and submission flow | e2e | Create form task, build form with elements, submit as assignee, verify completion. |
| 3 | E2E: Invitation and authentication flow | e2e | Admin invites user, user receives email, signs up, joins workspace, sees assigned tasks. |
| 4 | E2E: File upload and approval flow | e2e | Create file request task, upload file, create approval task, approve, verify completion chain. |

---

## Technical Notes

- E2E tests run AFTER all implementation specs are complete
- Happy path only - edge cases covered in component/unit tests
- Use Playwright with data-testid selectors
- Screenshots for visual verification
- Mock external services (SignNow, Google) in E2E

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (all sections for flows)
- Testing skill: `skills/tdd-agent/SKILL.md` (E2E Tasks section)
