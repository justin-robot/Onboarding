# Admin Role Architecture

## Implemented Solution: Workspace-Scoped Admin Access

The platform now uses **Option 2: Only Workspace Managers** with a platform admin escape hatch.

### How It Works

1. **Workspace Manager** (`workspace_member.role = "manager"`):
   - Can access the admin panel
   - Sees only workspaces where they are a manager
   - Can manage tasks, members, invitations within their workspaces
   - Primary admin mechanism for most users

2. **Platform Admin** (`user.isPlatformAdmin = true`):
   - Can access the admin panel
   - Sees ALL workspaces across the platform
   - Used for super-admin needs (bootstrap, global oversight)
   - Set via direct database update or during seeding

### Access Check Flow

```typescript
// In dashboard layout
const access = await adminAccessService.checkAccess(userId);
// Returns: { canAccess: boolean, isPlatformAdmin: boolean, managerWorkspaceIds: string[] }

// In API routes
const { workspaceIds, isPlatformAdmin } = await requireAdminAuth();
// workspaceIds is null for platform admins (no filter)
// workspaceIds is string[] for workspace managers (filter to these workspaces)
```

### Database Schema

```sql
-- User table has isPlatformAdmin column
ALTER TABLE "user" ADD COLUMN "isPlatformAdmin" BOOLEAN DEFAULT FALSE;

-- Workspace member role determines per-workspace manager access
-- workspace_member.role: "manager" | "member"
```

### Migration

Run the migration to add the `isPlatformAdmin` column:

```bash
pnpm --filter @repo/database migrate:dev
```

The migration (`20250311120000_add_is_platform_admin.ts`) will:
1. Add `isPlatformAdmin` column to `user` table
2. Set `isPlatformAdmin = true` for existing users with `role = 'admin'`

### Key Files

| File | Purpose |
|------|---------|
| `lib/services/adminAccess.ts` | Admin access checking service |
| `lib/services/member.ts` | Added `isManagerInAnyWorkspace()`, `getWorkspaceIdsWhereManager()` |
| `app/api/_lib/api-utils.ts` | Added `requireAdminAuth()` helper |
| `dashboard/layout.tsx` | Updated to use `adminAccessService.checkAccess()` |
| `api/admin/**/route.ts` | All routes updated to scope data by workspace |

### API Route Scoping

All admin API routes now:
1. Use `requireAdminAuth()` instead of checking `user.role === "admin"`
2. Filter data by `workspaceIds` when not a platform admin
3. Return 404 (not 403) when accessing resources outside scope

Example:
```typescript
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    // If not platform admin and no admin workspaces, return empty
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ data: [], total: 0 });
    }

    let query = database.selectFrom("workspace")...;

    // Scope by workspace IDs if not platform admin
    if (workspaceIds !== null) {
      query = query.where("workspace.id", "in", workspaceIds);
    }

    // ... rest of query
  });
}
```

### Becoming an Admin

| Admin Type | How to Get |
|------------|------------|
| Workspace Manager | Be added as manager to a workspace via invitation or direct member add |
| Platform Admin | Set `isPlatformAdmin = true` in database (seeded for admin@test.com) |

### Setting a Platform Admin

Currently requires direct database access:

```sql
UPDATE "user" SET "isPlatformAdmin" = true WHERE email = 'admin@example.com';
```

Or via seed data in `packages/database/seeds/seed.ts`:
```typescript
await db
  .updateTable("user")
  .set({ role: "admin", isPlatformAdmin: true })
  .where("id", "=", ids.adminUser)
  .execute();
```

### Future Improvements

1. **UI for Platform Admin**: Add toggle in user edit form (only for existing platform admins)
2. **Self-Service Workspace Admin**: Allow workspace admins to promote members
3. **Deprecate user.role**: Once migration is complete, `user.role` can be removed or repurposed

## Legacy: user.role Field

The `user.role` field still exists but is no longer used for admin panel access:
- `"admin"` - Previously granted full admin access, now just indicates user type
- `"account_manager"` - Business role, not related to permissions
- `"user"` - Default role

This field may be deprecated in a future version.
