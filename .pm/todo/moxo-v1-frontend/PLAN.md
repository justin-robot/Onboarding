# Moxo Frontend Completion Plan

Based on screenshots analysis and technical spec review.

## Current State
- **Completed**: Reusable components in `packages/design/components/moxo-layout/`
- **Missing**: Actual pages, data wiring, task type UIs

---

## Phase 1: Core Pages & Routing (2 days)

### 1.1 Create Page Structure
```
apps/app/app/(authenticated)/
├── workspaces/
│   └── page.tsx                    # Workspace list + create
├── workspace/[workspaceId]/
│   ├── page.tsx                    # Main workspace view (Flow tab default)
│   ├── files/page.tsx              # Files tab
│   ├── settings/page.tsx           # Workspace settings
│   └── members/page.tsx            # Member management
```

### 1.2 Workspace List Page
- Grid of workspace cards
- "Create Workspace" button
- Search/filter workspaces

### 1.3 Main Workspace Page
- Wire `MoxoLayout` component
- Fetch workspace with sections/tasks
- Implement Flow/Files tab switching
- Connect to Ably for real-time updates

---

## Phase 2: Flow View & Task Cards (2 days)

### 2.1 Flow View Container
- Render sections in order
- Collapsible section headers
- Section progress (X of Y completed)
- Timeline connector between tasks

### 2.2 Task Card Enhancements
- Task type icons (Form, Acknowledgement, E-Sign, etc.)
- Status badges: "Your Turn", "Completed", "In Progress", "Not Started"
- Assignee avatars
- "Review" button on active tasks
- Click to open Action Details panel

### 2.3 Admin Features (from screenshots)
- "Add New Action" button
- Task position selector modal
- Drag-drop reordering (dnd-kit already installed)

---

## Phase 3: Action Details Panel - Task Types (3 days)

### 3.1 Base Action Details Structure
Already exists in `action-details.tsx`, needs:
- Type-specific content sections
- Progress tracker per assignee
- Activity log (audit entries)
- Comments section with input

### 3.2 Form Task UI
```
- Task header with Form icon
- Description text
- "FORM RESPONSE" section
  - "View Form" button → opens form renderer
  - "Submitted by [name]" with download
- Progress section with assignee status
- Activity log
- Comment input
```

### 3.3 Acknowledgement Task UI
```
- Task header with badge icon
- Description/instructions
- "Attachments" section with file cards
- "Acknowledge" button (blue, full-width)
- Progress section
- Activity log
- Comment input
```

### 3.4 Time Booking Task UI
```
- Task header with calendar icon
- Description
- "Meeting Details" section
  - Meeting name
  - Duration (45 min)
  - Participants with avatars
- "Select a Date & Time" section
  - Date picker (Today, arrows)
  - Time slot grid (09:00 AM, 09:30 AM, etc.)
- "Confirm" button
- Progress section
- Activity log
```

### 3.5 E-Sign Task UI
```
- Task header with signature icon
- Description
- "E-Sign Document" section
  - Document thumbnail + name + size
- "Sign" button (blue, full-width) → redirects to SignNow
- Progress section (per signer: "Signing...")
- Activity log
- Comment input
```

### 3.6 File Upload Task UI
```
- Task header with upload icon
- Description
- Upload dropzone (drag & drop)
- Uploaded files list
- Progress section
- Activity log
- Comment input
```

### 3.7 Approval Task UI
```
- Task header with thumbs-up icon
- Description
- Files/content to review (from predecessor task)
- "Approve" and "Reject" buttons
- Rejection requires comment
- Progress section (per approver)
- Activity log
- Comment input
```

---

## Phase 4: Right Panel - Chat & Meetings (2 days)

### 4.1 Chat Panel
- Tab: "Chat" | "Meetings"
- Message list with types:
  - Text message (bubble, avatar, timestamp)
  - Annotation ("Annotated [Document]..." with thumbnail)
  - System message (centered, gray text)
  - Whiteboard embed
- Date separators ("Yesterday", "Today")
- Message input with emoji + attachment buttons
- "New Messages" indicator button

### 4.2 Meetings Panel
- List of upcoming meetings
- "Join" button for active meetings
- Meeting cards with time, participants

---

## Phase 5: Members & Settings (1.5 days)

### 5.1 Members Panel/Page
- "Invite Members" button
- Roles section (Admin, Account Manager)
- Assignees list with:
  - Avatar, name, email
  - Role badge
  - Online indicator (green dot)
  - Actions menu (...)
- "Workspace Link" section with copy button

### 5.2 Workspace Settings Page
- Edit workspace name, description
- Banner image upload
- Due date picker
- Danger zone (archive, delete)

### 5.3 Workspace Menu Dropdown
From screenshots:
- Bookmarks
- Members
- Settings
- Save as Template (admin)
- Automations & Events (admin)
- Add New Action (admin)

---

## Phase 6: Files Tab (1 day)

### 6.1 Files View
- "Add" button
- Sort/view toggle (grid/list)
- Folders (Attachments, etc.)
- File cards with thumbnails
- File preview on click

---

## Phase 7: Notifications & Polish (1 day)

### 7.1 Notification Toast
- "The next action is ready for you. Click to view"
- Dismissible
- Links to task

### 7.2 Real-time Updates
- Ably subscription for workspace events
- Optimistic UI updates
- Loading states

### 7.3 Error Handling
- API error toasts (Sonner)
- Empty states
- 404 handling

---

## Implementation Order (Priority)

| # | Task | Est. | Deps |
|---|------|------|------|
| 1 | Workspace list page | 0.5d | - |
| 2 | Main workspace page with MoxoLayout | 1d | 1 |
| 3 | Flow view with sections/tasks | 1d | 2 |
| 4 | Action Details - Form task | 0.5d | 3 |
| 5 | Action Details - Acknowledgement | 0.5d | 3 |
| 6 | Action Details - Time Booking | 0.5d | 3 |
| 7 | Action Details - E-Sign | 0.5d | 3 |
| 8 | Action Details - File Upload | 0.5d | 3 |
| 9 | Action Details - Approval | 0.5d | 3 |
| 10 | Chat panel | 1d | 2 |
| 11 | Meetings panel | 0.5d | 2 |
| 12 | Members panel | 0.5d | 2 |
| 13 | Files tab | 1d | 2 |
| 14 | Settings page | 0.5d | 2 |
| 15 | Admin features (add task, reorder) | 1d | 3 |
| 16 | Real-time & polish | 1d | all |

**Total: ~10-12 days**

---

## File Structure

```
apps/app/
├── app/(authenticated)/
│   ├── workspaces/page.tsx
│   └── workspace/[workspaceId]/
│       ├── page.tsx
│       ├── layout.tsx              # Shared layout with MoxoLayout
│       ├── files/page.tsx
│       ├── settings/page.tsx
│       └── members/page.tsx
├── components/
│   ├── workspace/
│   │   ├── workspace-card.tsx
│   │   ├── create-workspace-dialog.tsx
│   │   └── workspace-header.tsx
│   ├── flow/
│   │   ├── flow-view.tsx
│   │   ├── section-list.tsx
│   │   └── add-task-modal.tsx
│   ├── task-actions/
│   │   ├── form-action.tsx
│   │   ├── acknowledgement-action.tsx
│   │   ├── time-booking-action.tsx
│   │   ├── esign-action.tsx
│   │   ├── file-upload-action.tsx
│   │   └── approval-action.tsx
│   ├── chat/
│   │   ├── chat-panel.tsx
│   │   ├── message-list.tsx
│   │   ├── message-input.tsx
│   │   └── message-bubble.tsx
│   ├── meetings/
│   │   ├── meetings-panel.tsx
│   │   └── meeting-card.tsx
│   ├── members/
│   │   ├── members-panel.tsx
│   │   ├── invite-dialog.tsx
│   │   └── member-row.tsx
│   └── files/
│       ├── files-view.tsx
│       ├── file-card.tsx
│       └── upload-dialog.tsx
├── hooks/
│   ├── use-workspace.ts
│   ├── use-tasks.ts
│   ├── use-chat.ts
│   └── use-ably.ts
└── lib/
    └── api/
        ├── workspaces.ts
        ├── tasks.ts
        ├── chat.ts
        └── files.ts
```

---

## API Integration Points

| Feature | Endpoint | Service |
|---------|----------|---------|
| List workspaces | GET /api/workspaces | workspaceService |
| Get workspace | GET /api/workspaces/[id] | workspaceService |
| List tasks | (nested in workspace) | taskService |
| Complete task | POST /api/tasks/[id]/complete | completionService |
| Submit form | POST /api/submissions | submissionService |
| Upload file | POST /api/files/presigned | fileService |
| Send message | POST /api/messages | chatService |
| Get members | GET /api/workspaces/[id]/members | memberService |
| Invite member | POST /api/invitations | invitationService |

---

## Dependencies Already Available

- `react-resizable-panels` - Layout panels
- `dnd-kit` - Drag and drop
- `react-hook-form` - Form handling
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `vaul` - Mobile drawers
- `cmdk` - Search/command palette
- Ably SDK - Real-time
