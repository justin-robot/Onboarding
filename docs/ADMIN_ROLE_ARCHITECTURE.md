# Admin Role Architecture

## Current State

The platform currently has **two separate admin role systems** that create confusion:

### 1. Platform Admin (`user.role`)
- Stored on the `user` table
- Values: `"admin"`, `"account_manager"`, `"user"`
- Grants access to `/dashboard` (admin panel)
- Can see and manage **ALL** workspaces, tasks, users

### 2. Workspace Admin (`workspace_member.role`)
- Stored on the `workspace_member` table
- Values: `"admin"`, `"account_manager"`, `"user"`
- Grants admin privileges **within a specific workspace**
- Can manage tasks, members, settings for that workspace only

## The Problem

1. **Naming confusion**: Both use "admin" but mean different things
2. **Access mismatch**: A workspace admin cannot access the admin panel, even for their own workspace
3. **All-or-nothing**: Platform admin sees everything, no middle ground
4. **No self-service path**: Users cannot become platform admins through any UI flow (requires existing platform admin or direct database access)

## Options

### Option 1: Only Platform Admins

Keep `user.role = "admin"` as the only admin mechanism. Remove workspace-level admin distinction.

| Pros | Cons |
|------|------|
| Simple mental model | No delegation possible |
| Clear who can do what | Doesn't scale for large organizations |
| Easy to implement | Forces all-or-nothing trust |
| One place to check permissions | Can't have "department leads" |

**Best for:** Small teams, single-tenant deployments

### Option 2: Only Workspace Admins (Recommended)

Remove `user.role`. Admin panel access based on `workspace_member.role = "admin"`.

| Pros | Cons |
|------|------|
| Granular, scoped permissions | Need bootstrap mechanism for first user |
| Scales to large organizations | Global operations need special handling |
| Admin panel useful to more people | Slightly more complex queries |
| No confusing dual "admin" concept | |
| Natural delegation model | |

**Implementation:**
- Admin panel shows only workspaces where `workspace_member.role = "admin"`
- User management scoped to workspaces you admin
- Add `user.isPlatformAdmin` boolean for rare super-admin needs (bootstrap, global view)

**Best for:** Multi-tenant SaaS, organizations with multiple teams

### Option 3: Keep Both Systems

Maintain current architecture with both role systems.

| Pros | Cons |
|------|------|
| Maximum flexibility | Confusing - two "admin" concepts |
| Platform oversight + workspace delegation | More complex to explain to users |
| No migration needed | Two permission systems to maintain |
| | Easy to misconfigure |

**Best for:** Complex enterprise deployments with clear role documentation

## Recommendation

**Option 2: Only Workspace Admins** with a platform admin escape hatch.

### Proposed Schema Change

```sql
-- Remove role from user table (or keep for backwards compat)
ALTER TABLE "user" ADD COLUMN "isPlatformAdmin" BOOLEAN DEFAULT FALSE;

-- Workspace member role becomes the primary permission system
-- Already exists: workspace_member.role
```

### Proposed Access Logic

```typescript
// Admin panel access
const canAccessAdminPanel =
  user.isPlatformAdmin ||
  (await hasWorkspaceAdminRole(user.id));

// Admin panel data scope
const workspaces = user.isPlatformAdmin
  ? await getAllWorkspaces()
  : await getWorkspacesWhereAdmin(user.id);
```

### Migration Path

1. Add `isPlatformAdmin` column to `user` table
2. Set `isPlatformAdmin = true` for users where `role = 'admin'`
3. Update admin panel to scope data by workspace membership
4. Update permission checks throughout the app
5. Deprecate `user.role` (or repurpose for other uses)

## Questions to Resolve

1. **User creation**: Should workspace admins be able to create new users, or only invite to their workspaces?
2. **Cross-workspace visibility**: Should workspace admins see any data from workspaces they don't admin?
3. **Platform admin UI**: Should platform admins have a toggle to "see all" vs "see my workspaces"?
4. **Audit logs**: Should audit logs be scoped per-workspace in the admin panel?

## Related Files

- `apps/app/app/(authenticated)/dashboard/layout.tsx` - Admin panel access check
- `apps/app/app/(authenticated)/dashboard/users/edit.tsx` - User role editing
- `packages/database/schemas/main.ts` - Database schema
- `packages/database/seeds/seed.ts` - Seed data with role assignments
