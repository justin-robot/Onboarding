# Form Builder

**Status**: Not Started

---

## Scope

Admin UI for building forms with drag-and-drop.

**This spec covers**:
- Form builder canvas with dnd-kit
- Element palette (14 element types)
- Property editor sidebar
- Multi-page form support
- Auto-save on debounce

**Out of scope**:
- Form renderer (assignee view) → `09-form-submissions.md`
- Form element CRUD service → `03-task-type-configs.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database tables | ✅ |
| Kysely types | ✅ |
| dnd-kit package | ⏳ (needs to be added) |
| Builder UI | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Add dnd-kit to design package and create sortable list component | frontend | Package installed. Reusable SortableList component works. Unit tests pass. |
| 2 | Create form builder canvas with drag-and-drop | frontend | Elements can be dragged from palette to canvas. Reordering works. Multi-page tabs work. |
| 3 | Create element property editor sidebar | frontend | Selecting element shows property form. Changes update element config. Validation rules configurable. |
| 4 | Wire form builder to API with auto-save | frontend | Form config saves on 500ms debounce. Full replace in transaction. Loading existing form populates builder. |

---

## Technical Notes

- Element types: single_line_text, multiline_text, single_selection, multi_selection, dropdown, dynamic_dropdown, heading, image, file_upload, paragraph, name, address, email, phone
- Validation rules stored as JSONB matching react-hook-form register API
- Auto-save uses full replace, not incremental updates
- Multi-page: tabs at top, elements scoped to current page

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Form Builder section)
- Data model: `docs/moxo-data-model-final-v2.md` (FormConfig, FormPage, FormElement)
