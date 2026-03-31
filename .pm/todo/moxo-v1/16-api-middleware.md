# API Middleware and RBAC

**Status**: Not Started

---

## Scope

API middleware layers for authentication, workspace membership, and role-based access control.

**This spec covers**:
- Auth middleware (Better Auth session validation)
- Workspace middleware (membership verification)
- Role middleware (permission checking)
- Error handling standardization

**Out of scope**:
- Better Auth core setup (already in codestack)
- Specific API routes (handled by feature specs)

---

## What's Done

| Item | Status |
|------|--------|
| Better Auth configured | ✅ (packages/auth) |
| Session validation | ✅ (existing) |
| Workspace/role middleware | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create workspace middleware that verifies membership and attaches role | actions | Middleware validates user is workspace member. Attaches member role to request context. Non-members get 403. |
| 2 | Create role middleware for permission checking | actions | Middleware checks user role meets minimum required. Admin-only routes reject non-admins. Role hierarchy: admin > account_manager > user. |
| 3 | Standardize API error responses | actions | All errors follow consistent format. Status codes correct (400, 401, 403, 404, 500). Error messages helpful but don't leak internals. |

---

## Technical Notes

- Role hierarchy:
  - Admin: full workspace control, member management, settings, templates
  - Account Manager: create/edit sections/tasks, reassign, view all progress
  - User: complete assigned tasks only, view own tasks, participate in chat
- User role filtering: all task queries filter to only assigned tasks for User role
- Middleware order: auth → workspace → role

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (API Middleware, Role-Based Access Control sections)
