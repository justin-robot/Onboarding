# Moxo Screenshot Categories

This document categorizes the 32 screenshots of the original Moxo software for reference during development.

---

## 1. Workspace Overview / Flow View (8 screenshots)

Main workspace layout showing the task flow timeline and sections.

| File | Description |
|------|-------------|
| Screenshot 2026-02-13 at 7.29.12 AM.png | Full workspace with Flow/Files tabs, Initial Intake section, chat panel with whiteboard |
| Screenshot 2026-02-13 at 7.29.27 AM.png | Zoomed section view - Initial Intake with 3 tasks and vertical timeline |
| Screenshot 2026-02-13 at 7.30.31 AM.png | Workspace with chat showing document sharing and system events |
| Screenshot 2026-02-13 at 7.30.40 AM.png | Workspace with "Next action ready" notification banner |
| Screenshot 2026-02-13 at 7.30.50 AM.png | Workspace with Acknowledgement task details open |
| Screenshot 2026-02-13 at 7.30.58 AM.png | Workspace with Time Booking task (not started) |
| Screenshot 2026-02-13 at 7.31.08 AM.png | Workspace with Time Booking showing date/time slot picker |
| Screenshot 2026-02-13 at 7.31.31 AM.png | Workspace with E-Sign task details showing multiple signers |

---

## 2. Task Details Panel (6 screenshots)

Action details panels for different task types.

| File | Description |
|------|-------------|
| Screenshot 2026-02-13 at 7.29.39 AM.png | **Acknowledgement** - attachments, progress tracker, activity log |
| Screenshot 2026-02-13 at 7.30.01 AM.png | **Form** - completed form response, download option, activity log |
| Screenshot 2026-02-13 at 7.30.09 AM.png | **Time Booking** - meeting details (duration, participants), Confirm button |
| Screenshot 2026-02-13 at 7.30.18 AM.png | **E-Sign** - document preview, Sign button, multiple assignee progress |
| Screenshot 2026-02-13 at 7.31.48 AM.png | **E-Sign** - showing Document Collection section with multiple tasks |
| Screenshot 2026-02-13 at 7.30.40 AM.png | **Form** - with "Your Turn" badge and Review button |

---

## 3. Meetings / Video Conferencing (4 screenshots)

Built-in video meeting functionality.

| File | Description |
|------|-------------|
| Screenshot 2026-02-13 at 7.31.48 AM.png | Meetings panel - Meet Now, Schedule Meeting buttons, scheduling form |
| Screenshot 2026-02-13 at 7.31.57 AM.png | Start Meeting dialog - video toggle, participant selection |
| Screenshot 2026-02-13 at 7.32.07 AM.png | Active video call UI - screen share, chat, recording, participants |
| Screenshot 2026-02-13 at 7.32.20 AM.png | Meetings list - scheduled meeting with Rejoin button |

---

## 4. Chat Panel (3 screenshots)

Workspace messaging and activity feed.

| File | Description |
|------|-------------|
| Screenshot 2026-02-13 at 7.29.49 AM.png | Chat with annotated document shared, whiteboard message |
| Screenshot 2026-02-13 at 7.30.31 AM.png | Chat with file sharing, Join meeting button, system events |
| Screenshot 2026-02-13 at 7.34.10 AM.png | Chat with quote/reply feature, system events (rename, invite) |

---

## 5. Workspace Settings & Members (5 screenshots)

Configuration and member management.

| File | Description |
|------|-------------|
| Screenshot 2026-02-13 at 7.32.29 AM.png | Members panel - roles (Account Manager), assignees, workspace link |
| Screenshot 2026-02-13 at 7.32.40 AM.png | Bookmarks panel with saved items |
| Screenshot 2026-02-13 at 7.32.48 AM.png | Settings - name, description, due date, email address, notifications |
| Screenshot 2026-02-13 at 7.32.54 AM.png | Settings - reminders, pin to timeline, bookmark permissions |
| Screenshot 2026-02-13 at 7.33.00 AM.png | Settings - archive/delete workspace options |

---

## 6. Task Creation / Action Builder (9 screenshots)

Creating and configuring different task types.

| File | Description |
|------|-------------|
| Screenshot 2026-02-13 at 7.33.06 AM.png | **Position Selection** - choose where to insert new action in flow |
| Screenshot 2026-02-13 at 7.33.13 AM.png | **File Request** - title, description, due date, skip sequential order |
| Screenshot 2026-02-13 at 7.33.18 AM.png | **Form** - assignee selection with completion rules |
| Screenshot 2026-02-13 at 7.33.24 AM.png | **Form Builder** - drag-and-drop elements (text, dropdown, file upload, etc.) |
| Screenshot 2026-02-13 at 7.33.32 AM.png | **E-Sign** - upload document, title, description, due date |
| Screenshot 2026-02-13 at 7.33.42 AM.png | **E-Sign** - signer selection with signing order toggle |
| Screenshot 2026-02-13 at 7.33.48 AM.png | **E-Sign** - field assignment on document (signature, initials, date, text, checkbox) |
| Screenshot 2026-02-13 at 7.33.56 AM.png | **File Request** - uploaders, file reviewers, sequential order |
| Screenshot 2026-02-13 at 7.34.02 AM.png | **Approval** - assignee selection with sequential order |

---

## 7. Files Tab (1 screenshot)

| File | Description |
|------|-------------|
| Screenshot 2026-02-13 at 7.34.10 AM.png | Files tab showing Attachments folder with whiteboard file |

---

## Summary by Task Type Coverage

| Task Type | Screenshots Show |
|-----------|------------------|
| **Form** | Creation, builder UI, submission view, completed state |
| **Acknowledgement** | Task detail with attachments and progress |
| **Time Booking** | Meeting details, date/time slot picker, confirm flow |
| **E-Sign** | Creation flow, signer selection, field assignment on PDF, signing progress |
| **File Upload/Request** | Creation with uploaders/reviewers, sequential order |
| **Approval** | Assignee selection with sequential ordering |

---

## Key UI Patterns Observed

1. **Vertical Timeline** - Tasks connected by vertical line with numbered circles
2. **Section Grouping** - Tasks organized into collapsible sections (e.g., "Initial Intake", "Document Collection")
3. **"Your Turn" Badge** - Green badge indicating user action required
4. **Progress Tracker** - Shows assignee completion status (e.g., "0/2", "Completed")
5. **Activity Log** - Chronological list of task events with timestamps
6. **Split Layout** - Flow/tasks on left, chat/meetings on right
7. **Action Details Panel** - Slide-out panel for task details with type-specific UI
