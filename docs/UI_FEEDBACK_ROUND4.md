# UI Feedback Tasks - Round 4

Extracted from video review transcript. Priority: High (H), Medium (M), Low (L)

---

## Admin Panel - Header & Navigation

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 1 | **Header/button placement issues** - Review and fix button placement in admin panel header; "Save changes" and "Cancel" button placement is strange | M | [ ] | Yes | Need to see current header layout and button positions |
| 2 | **Admin cards should be clickable** - Dashboard cards should route to respective pages | M | [x] | No | Already completed in Round 3 - cards wrapped in Link components with hover styles |

---

## User Management

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 3 | **User editing workflow** - Improve workflow for editing user details | M | [ ] | No | "Only way I can edit users by clicking here, which is fine" - minor UX review |
| 4 | **Member details not clickable** - Member entries should be clickable to view/edit details | H | [x] | No | Added click handler, details dialog with role editing and removal (admin only) |
| 5 | **Hover states missing/inconsistent** - Review and add proper hover states throughout | M | [ ] | Yes | "The hover is kind of weird" - need to see which elements have odd hover behavior |

---

## Workspace Management

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 6 | **Workspace deletion behavior** - Review and improve workspace deletion flow | M | [x] | No | Implemented: Soft delete with 30-day countdown, hard delete option, auto-cleanup cron job, updated dialogs explain behavior |
| 7 | **Template creation workflow** - After saving as template, redirect to template or provide link | H | [x] | No | Fixed: Now redirects to /dashboard/templates after saving with success toast message |
| 8 | **I-icon not working** - Unknown icon button doesn't function | M | [ ] | Yes | "That doesn't work, whatever that I-icon is" - need to identify which icon |

---

## Tasks Page

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 9 | **Show due dates on tasks page** - Display due dates for tasks in list view | H | [ ] | No | "It would be useful to see when these tasks are due on this page" |
| 10 | **Show relationship to workspaces** - Make workspace association clearer on tasks page | M | [ ] | No | "Are these tasks that relate to a particular workspace?" - add workspace column/indicator |

---

## Invitations

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 11 | **Add create invitation from pending page** - Ability to create new invitations directly from pending invitations page | H | [x] | No | Fixed: Added "Create Invitation" button with dialog to select workspace, enter email, and choose role |

---

## Audit Logs

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 12 | **Add more information to audit logs** - Include additional context and details in audit log entries | M | [ ] | No | "Could have more information" - may need follow-up on what specific info is wanted |

---

## Notifications

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 13 | **Notifications not set up properly** - Review and fix notification system configuration | H | [ ] | No | "Notifications have not been set up" - core functionality issue |
| 14 | **Can't mark notifications as read/unread** - Add ability to toggle notification read status | H | [ ] | No | "I'm not able to mark things as unread" and "should be some type of note for why I can't mark" |

---

## Chat & Messaging

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 15 | **Send message input not centered** - Fix centering of message input area | L | [ ] | Yes | "The send message thing is not centered in this container" - need to see which container |

---

## Styling & Visual

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 16 | **Font issues on various pages** - Review and fix font inconsistencies | M | [ ] | Yes | "I believe, the font here" - need to identify which pages/elements have font issues |
| 17 | **General styling issues** - Multiple minor styling problems across pages | L | [ ] | Yes | "Some styling issues here... also some styling issues on this page" - need specific locations |

---

## Integrations

| # | Task | Priority | Status | Screenshot Needed? | Notes |
|---|------|----------|--------|-------------------|-------|
| 18 | **Google Calendar connection indicator** - Show which Google account is connected | M | [x] | No | Completed: Added accountEmail to workspace_integration, displays in meetings panel |

---

## Summary

- **Total tasks:** 18
- **Completed:** 5
- **Remaining:** 13
  - High priority: 3
  - Medium priority: 8
  - Low priority: 2

---

## Screenshots Needed

| Task # | What to capture |
|--------|-----------------|
| 1 | Admin panel header with button placement issue |
| 5 | Elements with inconsistent/weird hover states |
| 8 | The "I-icon" that doesn't work |
| 15 | Chat/messaging area showing uncentered input |
| 16 | Pages with font inconsistencies |
| 17 | Pages with general styling issues |

---

## Priority Order for Implementation

1. **Notifications not set up properly** (#13) - Core functionality
2. **Can't mark notifications as read/unread** (#14) - Expected feature
3. **Show due dates on tasks page** (#9) - Important visibility
4. **Add create invitation from pending page** (#11) - Workflow improvement
5. **Template creation workflow** (#7) - Key onboarding feature
6. Remaining medium priority items
7. Low priority polish items
