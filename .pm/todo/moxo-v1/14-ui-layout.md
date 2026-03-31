# UI Layout and Core Components

**Status**: Not Started

---

## Scope

Three-panel layout and core UI infrastructure.

**This spec covers**:
- Three-panel layout with react-resizable-panels
- Workspace list sidebar
- Activity feed panel
- Chat panel
- Responsive breakpoints (desktop/tablet/mobile)
- File grid and list views

**Out of scope**:
- Task-specific components → `15-task-ui-components.md`
- Form builder UI → `08-form-builder.md`

---

## What's Done

| Item | Status |
|------|--------|
| react-resizable-panels | ✅ (in design package) |
| vaul drawers | ✅ (in design package) |
| shadcn components | ✅ (in design package) |
| Layout components | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create three-panel layout with resizable panels | frontend | Desktop shows 3 columns. Panels resize correctly. State persists across navigation. |
| 2 | Create workspace list sidebar with navigation | frontend | Workspaces listed with status indicators. Clicking navigates to workspace. Create workspace button works. |
| 3 | Create activity feed panel with audit log display | frontend | Activity feed shows audit entries. Perspective-aware phrasing ("You" vs name). Pagination works. |
| 4 | Add responsive breakpoints with drawer fallbacks | frontend | Tablet: 2 columns, sidebar as drawer. Mobile: 1 column, bottom tabs, right panel as full-screen drawer. |

---

## Technical Notes

- Desktop (≥1024px): full three-column layout
- Tablet (768-1023px): two columns, sidebar becomes vaul drawer, right panel collapsible
- Mobile (<768px): single column, bottom tab navigation, right panel becomes full-screen vaul drawer
- Right panel context switches: activity feed / task details / chat

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (UI Structure section)
