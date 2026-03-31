# Task UI Components

**Status**: Not Started

---

## Scope

Task-specific UI components for the flow view.

**This spec covers**:
- TaskCard component (all 6 types)
- SectionHeader with collapse and progress
- Timeline connector between tasks
- ActionDetailsPanel (slide-over/drawer)
- Type-specific task views (acknowledgement, approval, file request, e-sign, time booking)

**Out of scope**:
- Form builder → `08-form-builder.md`
- Form renderer → `09-form-submissions.md`
- Layout infrastructure → `14-ui-layout.md`

---

## What's Done

| Item | Status |
|------|--------|
| shadcn Card, Collapsible, Badge | ✅ (in design package) |
| lucide-react icons | ✅ (in design package) |
| Task components | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create TaskCard component with type-specific styling | frontend | Renders all 6 task types. Step badge (checkmark/number/lock). Type icon color-coded. Assignee avatars. Action button. |
| 2 | Create SectionHeader with collapse and progress | frontend | Collapsible sections. Progress badge shows X/Y completed. Admin actions in dropdown menu. |
| 3 | Create Timeline connector and flow view | frontend | Vertical line with step badges connects TaskCards. Visual distinction for locked/unlocked/completed. |
| 4 | Create ActionDetailsPanel for task details | frontend | Slide-over on desktop, drawer on mobile. Shows full task context. Type-specific content renders. Comments and activity log. |

---

## Technical Notes

- TaskCard states: locked (dimmed), unlocked (active), in_progress (highlighted), completed (checkmark)
- Type icons: Form (📝), Acknowledgement (✓), Approval (👍), File Request (📁), E-Sign (✍️), Time Booking (📅)
- ActionDetailsPanel content varies by task type
- Comments use shadcn Textarea, activity uses audit log

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Key Components section)
