# Real-time and Chat

**Status**: Not Started

---

## Scope

Ably-powered real-time updates and workspace chat system.

**This spec covers**:
- Ably channel structure and authentication
- Real-time event broadcasting for task/section updates
- Workspace chat messages (text, annotation, system)
- Chat API with cursor-based pagination

**Out of scope**:
- Chat UI components → `14-ui-layout.md`
- Notifications (handled by Knock) → `07-notifications.md`

---

## What's Done

| Item | Status |
|------|--------|
| Ably package configured | ✅ (packages/realtime) |
| Database table (message) | ✅ |
| Kysely types | ✅ |
| Real-time service | ⏳ |
| Chat service | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create Ably channel service with workspace scoping | actions | Channel names follow convention. Token auth ensures only members can subscribe. Events broadcast correctly. |
| 2 | Wire real-time broadcasts into task and section operations | actions | Task create/update/delete broadcasts events. Section status changes broadcast. Members can subscribe and receive updates. |
| 3 | Create chat service with message types and pagination | actions | Unit tests pass. Text, annotation, system messages work. Cursor-based pagination works. Attachments link correctly. |

---

## Technical Notes

- Channel structure:
  - `workspace:{id}` - task updates, activity events
  - `workspace:{id}:chat` - chat messages
  - `user:{id}` - private notifications (optional, Knock handles most)
- Message types: text (user message), annotation (references doc/task), system (auto-generated)
- System messages created automatically on task events
- Pagination: cursor-based, not offset-based

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Ably, Chat System sections)
- Data model: `docs/moxo-data-model-final-v2.md` (Message)
- Codestack: `packages/realtime/`
