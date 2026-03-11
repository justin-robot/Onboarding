# UI Feedback Tasks

Extracted from review transcripts. Priority: High (H), Medium (M), Low (L)

---

## Navigation & Layout

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | **Sidebar collapse icon wrong** - Shows collapse arrow when collapsed; should show expand arrow | H | [x] |
| 2 | **No way to exit workspace** - Add navigation to home view/sign out from workspace | H | [x] |
| 3 | **Top bar should be fixed** - Prevent scrolling past the header bar | M | [x] |
| 4 | **Horizontal scroll issues** - Remove unexpected horizontal scroll in multiple areas | M | [x] |
| 5 | **Drag bar placement** - Resize handle is in a weird position; check Moxo for reference | L | [x] |

---

## Workspaces Page

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6 | **Weird card formatting** - Cards on workspaces page need better spacing | M | [x] |
| 7 | **"Add new" button misbehavior** - Clicking takes user back to workspaces unexpectedly | H | [x] |
| 8 | **Hide "Create workspace" for clients** - Regular users/clients shouldn't see this option | H | [x] |

---

## Task Cards & Status

| # | Task | Priority | Status |
|---|------|----------|--------|
| 9 | **Remove loading spinner on "In Progress"** - Progress indicator shouldn't show loading state | M | [x] |
| 10 | **Show locked task indicator** - Add lock icon for locked tasks; hoverable to show unlock requirements | H | [x] |
| 11 | **Color inconsistency** - Task type colors differ between views (blue vs gray); make consistent | M | [ ] |
| 12 | **Show assignees on task card** - Display who a task is assigned to on the task list view | M | [x] |
| 13 | **"Done" trigger from task view** - Consider collapsing task and showing green border when completed | L | [ ] |

---

## User & Member Display

| # | Task | Priority | Status |
|---|------|----------|--------|
| 14 | **Make member avatars hoverable** - Show all workspace members when hovering the avatar stack | M | [ ] |
| 15 | **Show logged-in user** - Display which account is logged in (e.g., "Sarah Chen") | H | [x] |

---

## Google Calendar / Meetings

| # | Task | Priority | Status |
|---|------|----------|--------|
| 16 | **Google Calendar connect opens new tab** - Should open in new tab/modal instead of navigating away | H | [ ] |

---

## Forms

| # | Task | Priority | Status |
|---|------|----------|--------|
| 17 | **Preview form opens new tab** - "Preview Form" should open in new tab (Edit Form in same page is fine) | M | [ ] |
| 18 | **Preview form spacing** - Not enough spacing; should be vertically centered | L | [ ] |

---

## Chat & Notifications

| # | Task | Priority | Status |
|---|------|----------|--------|
| 19 | **New message popup position** - Should appear at bottom of chat container, not center of page | H | [ ] |
| 20 | **Notification settings page** - Add notification preferences to settings | M | [ ] |

---

## New Pages Needed

| # | Task | Priority | Status |
|---|------|----------|--------|
| 21 | **Admin dashboard** - Create admin dashboard (recommend React Admin) | H | [ ] |
| 22 | **Settings page** - Create settings page (recommend Tremor template) | H | [ ] |

---

## Misc / Unclear

| # | Task | Priority | Status |
|---|------|----------|--------|
| 23 | **Unresponsive element** - Something is clickable but does nothing (needs identification) | M | [ ] |
| 24 | **"Delete progress" confusion** - Assign to task flow seems strange; review UX | L | [ ] |
| 25 | **Tab underlines** - Add underline styling to tab navigation | L | [ ] |

---

## Summary

- **Total tasks:** 25
- **Completed:** 12
- **Remaining:** 13
  - High priority: 3
  - Medium priority: 6
  - Low priority: 4

### Reference Links
- [Tremor Settings Template](https://www.tremor.so/blocks/settings-page)
- [React Admin](https://marmelab.com/react-admin/)
- Check Moxo screenshots for drag handle and assignee display patterns
