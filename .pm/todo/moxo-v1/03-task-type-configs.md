# Task Type Configurations

**Status**: Not Started

---

## Scope

Polymorphic type-specific configuration for all 6 task types.

**This spec covers**:
- FormConfig, FormPage, FormElement CRUD
- AcknowledgementConfig CRUD
- TimeBookingConfig CRUD
- ESignConfig CRUD
- FileRequestConfig CRUD
- ApprovalConfig, Approver CRUD
- Auto-creation of config when task is created

**Out of scope**:
- Form builder UI → `08-form-builder.md`
- Form submission handling → `09-form-submissions.md`
- E-sign provider integration → `12-signnow-integration.md`
- File upload handling → `10-file-system.md`

---

## What's Done

| Item | Status |
|------|--------|
| Database tables (all type configs) | ✅ |
| Kysely types | ✅ |
| Config services | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create config services for all 6 task types | actions | Unit tests pass for CRUD on each config type. Creating task auto-creates appropriate config. |
| 2 | Add config loading to task queries | actions | Task GET includes type-specific config in response. Polymorphic loading based on task.type. |
| 3 | Add form element CRUD with validation schema support | actions | Unit tests pass. Elements store validation rules as JSONB. Position management works. |

---

## Technical Notes

- Each task type has exactly one config (1:1 via unique taskId constraint)
- Config is auto-created when task is created based on task.type
- FormConfig → FormPage → FormElement hierarchy
- FormElement.options and FormElement.validation are JSONB columns
- Validation schema matches react-hook-form register API

---

## References

- Data model: `docs/moxo-data-model-final-v2.md` (Type-Specific Configs section)
- Database schema: `packages/database/migrations/20250204120001_moxo_task_types.ts`
