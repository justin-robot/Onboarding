# UI Feedback Tasks - Round 2

Extracted from video review transcript. Priority: High (H), Medium (M), Low (L)

---

## Workspaces Page Layout

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 1 | **Header layout restructure** - Move "Workspaces" title to far left, account/user menu to far right | H | [ ] | Create proper header with spread layout |
| 2 | **Reposition Create Workspace & Admin buttons** - Move to appropriate header positions | M | [ ] | Needs visual reference |
| 3 | **Move search to left** - Search workspaces input should be on the left side | M | [ ] | |

---

## Workspace Task View

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 4 | **Add bottom border to header** - Add subtle border at bottom of top bar | L | [ ] | |
| 5 | **Fix Shift+Enter for new line in chat** - Currently not working | H | [ ] | |
| 6 | **Emoji reaction behavior** - Reactions disappear on click, feels finicky | M | [x] | Picker now stays open for multiple selections |
| 7 | **Remove "Powered by Knock"** - Hide branding if possible | L | [ ] | May not be possible depending on Knock plan |
| 8 | **Button placement in task view** - Move button further right | M | [ ] | Needs visual reference |
| 9 | **In Progress indicator gap** - Strange gap in progress indicator | M | [ ] | Check Moxo for reference |
| 10 | **Make task header sticky** - Header should stick to top when scrolling | H | [ ] | CSS `position: sticky` |
| 11 | **Consolidate file upload position** - File element position inconsistent | M | [ ] | Sometimes in different places |

---

## Meetings Panel

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 12 | **Fix meetings container scroll** - Unable to scroll within meetings container | H | [ ] | |
| 13 | **Add spacing to meeting elements** - More spacing on top and bottom | L | [ ] | |

---

## Acknowledgement Tasks

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 14 | **Bug: Re-acknowledge already acknowledged task** - Shows "Failed to Acknowledge" when clicking on completed task | H | [ ] | Should disable button or show different state |
| 15 | **Activity log not showing acknowledgment** - Acknowledgment not appearing in activity log | H | [ ] | |
| 16 | **Acknowledgment element positioning** - Review placement | M | [ ] | Check Moxo for reference |

---

## Invitations & Members

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 17 | **Test invite flow thoroughly** - Verify invitation links work correctly | H | [ ] | |
| 18 | **Add confirmation dialog for cancel invitation** - "Are you sure?" prompt | M | [ ] | |

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
| 25 | **Remove horizontal scroll** - Unexpected sideways scroll appearing | M | [ ] | |
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
- **Completed:** 1
- **Remaining:** 29
  - High priority: 11
  - Medium priority: 12
  - Low priority: 6

### Items Needing Visual Reference
- Task 8, 9, 16: Check Moxo screenshots for reference
- Task 1, 2: Header layout needs design clarity
- Task 28: Notification formatting

### Architecture Considerations
- Task 21, 22: Template system requires backend design
- Task 26: Published/draft state needs data model changes
- Task 27: Pre-claim assignment needs auth flow consideration
