# UI Feedback Tasks - Round 2

Extracted from video review transcript. Priority: High (H), Medium (M), Low (L)

---

## Workspaces Page Layout

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 1 | **Header layout restructure** - Move "Workspaces" title to far left, account/user menu to far right | H | [x] | Fixed flex alignment with explicit items-start and justify-between |
| 2 | **Reposition Create Workspace & Admin buttons** - Move to appropriate header positions | M | [x] | Buttons now on right with UserMenu, shrink-0 prevents compression |
| 3 | **Move search to left** - Search workspaces input should be on the left side | M | [x] | Search now left-aligned with full width on mobile |

---

## Workspace Task View

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 4 | **Add bottom border to header** - Add subtle border at bottom of top bar | L | [x] | Added border-b to desktop header |
| 5 | **Fix Shift+Enter for new line in chat** - Currently not working | H | [x] | Replaced input with auto-growing textarea |
| 6 | **Emoji reaction behavior** - Reactions disappear on click, feels finicky | M | [x] | Picker now stays open for multiple selections |
| 7 | **Remove "Powered by Knock"** - Hide branding if possible | L | [x] | Hidden via CSS |
| 8 | **Button placement in task view** - Move button further right | M | [x] | Grouped View and X buttons on far right |
| 9 | **In Progress indicator gap** - Strange gap in progress indicator | M | [x] | Changed justify-between to gap-3 |
| 10 | **Make task header sticky** - Header should stick to top when scrolling | H | [x] | Task title/desc now sticky in details panel |
| 11 | **Consolidate file upload position** - File element position inconsistent | M | [x] | Added dedicated "Uploaded Files" section at consistent position |

---

## Meetings Panel

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 12 | **Fix meetings container scroll** - Unable to scroll within meetings container | H | [x] | Added min-h-0 to flex containers |
| 13 | **Add spacing to meeting elements** - More spacing on top and bottom | L | [x] | Increased section margins from mb-4 to mb-6 |

---

## Acknowledgement Tasks

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 14 | **Bug: Re-acknowledge already acknowledged task** - Shows "Failed to Acknowledge" when clicking on completed task | H | [x] | Now shows "You have acknowledged this task" state instead of button |
| 15 | **Activity log not showing acknowledgment** - Acknowledgment not appearing in activity log | H | [x] | Fixed event type to always be acknowledgement.completed |
| 16 | **Acknowledgment element positioning** - Review placement | M | [ ] | Check Moxo for reference |

---

## Invitations & Members

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 17 | **Test invite flow thoroughly** - Verify invitation links work correctly | H | [ ] | |
| 18 | **Add confirmation dialog for cancel invitation** - "Are you sure?" prompt | M | [x] | Added AlertDialog to both admin list and members panel |

---

## Admin Panel / Settings

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 19 | **Make settings page full width** - Extend to full page width instead of narrow container | M | [ ] | |
| 20 | **Add duplicate workspace button** - Quick duplicate functionality | H | [ ] | |
| 21 | **Add workspace templates concept** - For bulk user/client creation workflows | H | [ ] | Important for onboarding process |
| 22 | **API for template creation** - Templates should be creatable via API | M | [ ] | For automation purposes |
| 23 | **Theme toggle position** - Move to correct location | M | [ ] | Currently in wrong place |
| 24 | **Theme toggle animation** - Fix weird animation on toggle | L | [ ] | |

---

## General UX Issues

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 25 | **Remove horizontal scroll** - Unexpected sideways scroll appearing | M | [x] | Added overflow-x-hidden to body in global CSS |
| 26 | **Published/Unpublished workspace state** - Don't notify users while workspace is being set up | H | [ ] | Prevents premature notifications during setup |
| 27 | **Pre-claim user assignment** - Ability to assign tasks before user account is claimed | M | [ ] | Needs design consideration |

---

## Notifications

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 28 | **Notification formatting issues** - Layout problems in notification display | M | [ ] | Needs visual reference |
| 29 | **Notification font issues** - Font appears wrong/inconsistent | L | [ ] | |

---

## User Menu / Header

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 30 | **Gap between header elements** - Add spacing between user menu items | L | [ ] | |

---

## Summary

- **Total tasks:** 30
- **Completed:** 16
- **Remaining:** 14
  - High priority: 5
  - Medium priority: 4
  - Low priority: 5

### Items Needing Visual Reference
- Task 16: Check Moxo screenshots for reference
- Task 28: Notification formatting

### Architecture Considerations
- Task 21, 22: Template system requires backend design
- Task 26: Published/draft state needs data model changes
- Task 27: Pre-claim assignment needs auth flow consideration
