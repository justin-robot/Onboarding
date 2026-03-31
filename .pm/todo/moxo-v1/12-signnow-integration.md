# SignNow Integration

**Status**: Not Started

---

## Scope

E-signature integration with SignNow for E_SIGN task type.

**This spec covers**:
- SignNow SDK integration
- Document push to SignNow
- Signing URL generation
- Webhook handling for completion events

**Out of scope**:
- E-sign task UI → `15-task-ui-components.md`
- Svix webhook infrastructure (already in codestack)

---

## What's Done

| Item | Status |
|------|--------|
| Database table (esign_config) | ✅ |
| Kysely types | ✅ |
| Svix webhooks | ✅ (in codestack) |
| SignNow SDK | ⏳ (needs to be added) |
| SignNow service | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Add SignNow SDK and create document push service | actions | SDK installed. Document uploaded to SignNow. Document ID and signing URL stored in ESignConfig. |
| 2 | Create SignNow webhook handler | actions | Svix receives and validates webhook. Handler finds matching task. Completion updates ESignConfig status and stores signed document URL. Task completion triggered. |
| 3 | Wire e-sign events to audit log | actions | All SignNow events written to audit log with source='signnow'. Document sent, viewed, signed events tracked. |

---

## Technical Notes

- Flow: Admin uploads doc → push to SignNow → get signing URL → signer redirected to SignNow → SignNow webhook on completion → update task
- No embedding - signer opens SignNow in new tab
- Webhook events: document.completed, document.viewed, etc.
- Store completed document URL for download

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (SignNow Integration section)
- Data model: `docs/moxo-data-model-final-v2.md` (ESignConfig)
