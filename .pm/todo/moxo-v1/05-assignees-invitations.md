# Assignees and Invitations

**Status**: Not Started

---

## Scope

Workspace membership, task assignment, and invitation-based signup.

**This spec covers**:
- WorkspaceMember CRUD with role management
- TaskAssignee CRUD with validation
- PendingInvitation creation and token handling
- Invitation email sending via Resend
- Invitation redemption on signup

**Out of scope**:
- Better Auth core setup (already exists in codestack)
- Notification on assignment → `07-notifications.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database tables | ✅ |
| Kysely types | ✅ |
| Better Auth config | ✅ (existing) |
| Member/assignee services | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create workspace member service with role management | actions | Unit tests pass. Add/remove members works. Role updates work. Unique constraint enforced. |
| 2 | Create task assignee service with validation | actions | Unit tests pass. Assignees must be workspace members. Duplicate assignment rejected. |
| 3 | Create invitation service with token generation and redemption | actions | Unit tests pass. Token generated, email sent via Resend. Signup with valid token creates member. Expired tokens rejected. |

---

## Technical Notes

- Roles: admin, account_manager, user
- Invitation flow: admin invites → email with token → invitee signs up → auto-added to workspace
- Token expires after 72 hours
- Assignee validation: user must be a member of the task's workspace

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Authentication section)
- Data model: `docs/moxo-data-model-final-v2.md` (WorkspaceMember, TaskAssignee, PendingInvitation)
