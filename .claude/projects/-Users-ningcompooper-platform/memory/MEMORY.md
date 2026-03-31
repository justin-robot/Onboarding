# Platform Memory

## Database Service Patterns

### Service Structure
Services live in `packages/database/services/{entity}.ts` and are exported from `packages/database/index.ts`.

Standard methods:
- `create(input: NewEntity)` → returns created entity
- `getById(id: string)` → returns entity or null, excludes soft-deleted
- `update(id: string, input)` → returns updated entity or null
- `softDelete(id: string)` → returns boolean (true if deleted)
- `list()` → returns array, excludes soft-deleted
- `restore(id: string)` → returns restored entity or null

### Soft Delete Pattern
All entities with `deletedAt` column:
- Filter with `.where("deletedAt", "is", null)` for normal queries
- For soft delete: `.set({ deletedAt: new Date() })`
- For restore: `.set({ deletedAt: null, updatedAt: new Date() })`

### Testing
- Tests in `packages/database/__tests__/{entity}.test.ts`
- Vitest config in `packages/database/vitest.config.ts`
- Setup file loads env from `../../.env.local`
- Track created IDs and cleanup in `afterAll` (delete in reverse dependency order)

### Naming Convention
- Database columns: camelCase (workspaceId, deletedAt)
- Table names: snake_case (workspace_member, task_dependency)

### Clock Skew Note
Database server (Neon) may have different time than Node.js runtime. Avoid strict timestamp comparisons in tests.

### Neon Serverless Limitations
- **No interactive transactions**: `database.transaction().execute()` throws error
- For batch updates (like reordering), run sequential updates instead
- Each update is atomic; full transaction atomicity not available in HTTP mode
