# File System

**Status**: Not Started

---

## Scope

File uploads, thumbnails, and versioning.

**This spec covers**:
- Presigned URL generation for uploads
- Upload confirmation and file record creation
- Thumbnail generation with sharp
- File versioning via previous_version_id
- File request task upload handling

**Out of scope**:
- File grid/list UI → `14-ui-layout.md`
- Approval of uploaded files (use Approval tasks)

---

## What's Done

| Item | Status |
|------|--------|
| Database table (file) | ✅ |
| Kysely types | ✅ |
| S3 storage config | ✅ (in codestack) |
| sharp package | ⏳ (needs to be added) |
| File service | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Create file upload service with presigned URLs | actions | Unit tests pass. Presigned URL generated. Upload confirmation creates File record. |
| 2 | Add thumbnail generation with sharp | actions | Images resized to thumbnail. PDFs have first page converted. Thumbnail uploaded to storage. thumbnailKey populated. |
| 3 | Add file versioning support | actions | Replacing file creates new record with previous_version_id. Version history query works by walking chain. |

---

## Technical Notes

- Upload flow: request presigned URL → upload directly to S3 → confirm upload → create File record → generate thumbnail async
- Thumbnail generation can run as async function after confirmation (no job queue needed for v1)
- File versioning: linked list via previous_version_id
- sourceType: upload, task_attachment, chat
- sourceTaskId links files to tasks for File Request upload status derivation

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (File System section)
- Data model: `docs/moxo-data-model-final-v2.md` (File)
