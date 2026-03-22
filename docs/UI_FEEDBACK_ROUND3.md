# UI Feedback Tasks - Round 3

Extracted from video review transcript. Priority: High (H), Medium (M), Low (L)

---

## Workspace Task View

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 1 | **Right panel not expanding when collapsed** - Clicking members/tasks/meetings buttons doesn't expand collapsed right panel on desktop | H | [x] | No | Fixed: Added useEffect to expand panel + sync collapse state to parent via onRightPanelOpenChange callbacks |
| 2 | **Inconsistent spacing on workspace page** - Workspace menu should extend further; spacing issues | M | [x] | No | Fixed: wider sheet (320-360px), extended menu items edge-to-edge, full-width dividers, taller buttons |
| 3 | **Add Section should auto-scroll** - When clicking "Add Section", scroll to the newly added section at bottom | M | [x] | No | Fixed: Added data-section-id attribute and useEffect to scroll to new section after creation |
| 4 | **No way to delete a section** - Missing section delete functionality | H | [ ] | No | Feature gap - needs implementation |
| 5 | **Task click doesn't show side panel** - Side panel doesn't show up when clicking a task | H | [x] | No | Fixed: Same fix as #1 - right panel now expands when collapsed |
| 6 | **Cannot edit task title in config** - Task configuration dialog doesn't allow changing the task title | H | [x] | No | Fixed: Replaced read-only title display with editable input, title saved via PUT /api/tasks/[id] |
| 7 | **Task config form not centered** - Form/dialog is not centered properly | L | [ ] | Yes | Need to see which form specifically |

---

## Due Dates

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 8 | **Clarify days calculation** - Unclear if due date offsets are calendar days or business days; recommend making it business days or at least labeling | M | [ ] | No | UX clarification needed |

---

## File Upload

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 9 | **File upload not working** - Upload functionality broken in task view | H | [x] | No | Fixed: Added missing Content-Type header to S3 upload request in FileUploadTaskAction |

---

## Notifications & Chat

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 10 | **Notifications rendering in wrong position** - Notifications appearing in unexpected location | H | [ ] | Yes | Need to see where they're appearing |
| 11 | **Reply button in wrong place** - Reply button showing up in weird position in chat | M | [ ] | Yes | Need visual reference |
| 12 | **Message failed to send** - Chat messages failing to send | H | [ ] | No | Bug - needs debugging |
| 13 | **Sent message not showing "replied" state** - After sending, doesn't show that message was sent | M | [ ] | No | UI feedback issue |

---

## Meetings Panel

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 14 | **Calendar connection unclear** - Not clear which calendar the meetings are connected to | M | [ ] | No | Add indicator showing connected account |
| 15 | **Add bottom border to meetings section** - Need a line at bottom for visual separation | L | [ ] | No | Styling fix |
| 16 | **Draggable resize line causing gap** - The resize handle creates a visible gap; should be flush | M | [ ] | Yes | Need to see current implementation vs expected |

---

## Create Workspace

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 17 | **Create workspace button placement** - Button seems to be in a weird/unexpected place | L | [ ] | Yes | Need to see current placement |

---

## Admin Panel

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 18 | **Admin cards should be clickable** - Dashboard cards should route to their respective pages when clicked | M | [ ] | No | UX improvement |
| 19 | **Missing loading state in admin** - Add loading indicators | M | [ ] | Yes | Need to see which area needs loading state |
| 20 | **Admin sidebar state persistence** - Remember collapsed/expanded state of admin sidebar | L | [ ] | No | Store in localStorage |
| 21 | **Admin table pagination** - Ensure pagination is working on admin tables | M | [ ] | No | Verify implementation |

---

## Summary

- **Total tasks:** 21
- **Completed:** 6
- **Remaining:** 15
  - High priority: 3
  - Medium priority: 8
  - Low priority: 4

---

## Screenshots Needed

| Task # | What to capture |
|--------|-----------------|
| 7 | Task config form centering issue |
| 10 | Notifications rendering in wrong position |
| 11 | Reply button placement in chat |
| 16 | Draggable resize line and the gap it creates |
| 17 | Create workspace button current placement |
| 19 | Admin area that needs loading state |

---

## Priority Order for Implementation

1. **Message failed to send** (#12) - Core functionality broken
2. **No way to delete a section** (#4) - Missing feature
3. **Cannot edit task title in config** (#6) - Missing feature
4. **Notifications rendering wrong** (#10) - UI bug
5. Remaining medium priority items
6. Low priority polish items
