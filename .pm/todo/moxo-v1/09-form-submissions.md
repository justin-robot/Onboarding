# Form Submissions

**Status**: Not Started

---

## Scope

Assignee form rendering, validation, draft saving, and submission.

**This spec covers**:
- Form renderer using react-hook-form
- Server-side validation with Zod
- Draft auto-saving
- Submission handling and task completion trigger

**Out of scope**:
- Form builder UI → `08-form-builder.md`
- Task completion logic → `04-task-flow-engine.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database tables (form_submission, form_field_response) | ✅ |
| Kysely types | ✅ |
| react-hook-form | ✅ (in design package) |
| Form renderer | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create form renderer that maps FormElement to shadcn inputs | frontend | All 14 element types render correctly. Validation rules applied via react-hook-form register. |
| 2 | Add draft saving with auto-save on debounce | frontend | Drafts save every 500ms. Returning to form loads draft. Status = 'draft' until submit. |
| 3 | Create submission API with server-side validation | actions | Zod validates all fields. Invalid submissions rejected. Valid submissions create FormSubmission + FormFieldResponse records. Task completion triggered. |

---

## Technical Notes

- Element type → shadcn component mapping:
  - single_line_text → Input
  - multiline_text → Textarea
  - single_selection → RadioGroup
  - multi_selection → Checkbox group
  - dropdown → Select
  - file_upload → File input with upload handling
- Validation rules from FormElement.validation passed to react-hook-form
- Multi-page: validate current page before allowing navigation

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Form Builder - Saving and Submitting section)
- Data model: `docs/moxo-data-model-final-v2.md` (FormSubmission, FormFieldResponse)
