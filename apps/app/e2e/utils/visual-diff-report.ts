/**
 * Visual Diff Report Utilities
 *
 * Helpers for comparing current UI against Moxo reference screenshots
 * and generating detailed difference reports.
 */

import * as fs from "fs";
import * as path from "path";

// Reference screenshot categories from screenshot-categories.md
export const REFERENCE_CATEGORIES = {
  WORKSPACE_OVERVIEW: {
    description: "Main workspace layout showing task flow timeline and sections",
    screenshots: [
      {
        file: "Screenshot 2026-02-13 at 7.29.12 AM.png",
        description: "Full workspace with Flow/Files tabs, Initial Intake section, chat panel",
      },
      {
        file: "Screenshot 2026-02-13 at 7.29.27 AM.png",
        description: "Zoomed section view - Initial Intake with 3 tasks and vertical timeline",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.31 AM.png",
        description: "Workspace with chat showing document sharing and system events",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.40 AM.png",
        description: "Workspace with 'Next action ready' notification banner",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.50 AM.png",
        description: "Workspace with Acknowledgement task details open",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.58 AM.png",
        description: "Workspace with Time Booking task (not started)",
      },
      {
        file: "Screenshot 2026-02-13 at 7.31.08 AM.png",
        description: "Workspace with Time Booking showing date/time slot picker",
      },
      {
        file: "Screenshot 2026-02-13 at 7.31.31 AM.png",
        description: "Workspace with E-Sign task details showing multiple signers",
      },
    ],
  },
  TASK_DETAILS: {
    description: "Action details panels for different task types",
    screenshots: [
      {
        file: "Screenshot 2026-02-13 at 7.29.39 AM.png",
        description: "Acknowledgement - attachments, progress tracker, activity log",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.01 AM.png",
        description: "Form - completed form response, download option, activity log",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.09 AM.png",
        description: "Time Booking - meeting details (duration, participants), Confirm button",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.18 AM.png",
        description: "E-Sign - document preview, Sign button, multiple assignee progress",
      },
      {
        file: "Screenshot 2026-02-13 at 7.31.48 AM.png",
        description: "E-Sign - showing Document Collection section with multiple tasks",
      },
    ],
  },
  MEETINGS: {
    description: "Built-in video meeting functionality",
    screenshots: [
      {
        file: "Screenshot 2026-02-13 at 7.31.48 AM.png",
        description: "Meetings panel - Meet Now, Schedule Meeting buttons",
      },
      {
        file: "Screenshot 2026-02-13 at 7.31.57 AM.png",
        description: "Start Meeting dialog - video toggle, participant selection",
      },
      {
        file: "Screenshot 2026-02-13 at 7.32.07 AM.png",
        description: "Active video call UI - screen share, chat, recording",
      },
      {
        file: "Screenshot 2026-02-13 at 7.32.20 AM.png",
        description: "Meetings list - scheduled meeting with Rejoin button",
      },
    ],
  },
  CHAT: {
    description: "Workspace messaging and activity feed",
    screenshots: [
      {
        file: "Screenshot 2026-02-13 at 7.29.49 AM.png",
        description: "Chat with annotated document shared, whiteboard message",
      },
      {
        file: "Screenshot 2026-02-13 at 7.30.31 AM.png",
        description: "Chat with file sharing, Join meeting button, system events",
      },
      {
        file: "Screenshot 2026-02-13 at 7.34.10 AM.png",
        description: "Chat with quote/reply feature, system events",
      },
    ],
  },
  SETTINGS: {
    description: "Configuration and member management",
    screenshots: [
      {
        file: "Screenshot 2026-02-13 at 7.32.29 AM.png",
        description: "Members panel - roles, assignees, workspace link",
      },
      {
        file: "Screenshot 2026-02-13 at 7.32.40 AM.png",
        description: "Bookmarks panel with saved items",
      },
      {
        file: "Screenshot 2026-02-13 at 7.32.48 AM.png",
        description: "Settings - name, description, due date, email, notifications",
      },
      {
        file: "Screenshot 2026-02-13 at 7.32.54 AM.png",
        description: "Settings - reminders, pin to timeline, bookmark permissions",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.00 AM.png",
        description: "Settings - archive/delete workspace options",
      },
    ],
  },
  TASK_CREATION: {
    description: "Creating and configuring different task types",
    screenshots: [
      {
        file: "Screenshot 2026-02-13 at 7.33.06 AM.png",
        description: "Position Selection - choose where to insert new action",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.13 AM.png",
        description: "File Request - title, description, due date, skip order",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.18 AM.png",
        description: "Form - assignee selection with completion rules",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.24 AM.png",
        description: "Form Builder - drag-and-drop elements",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.32 AM.png",
        description: "E-Sign - upload document, title, description, due date",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.42 AM.png",
        description: "E-Sign - signer selection with signing order toggle",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.48 AM.png",
        description: "E-Sign - field assignment on document",
      },
      {
        file: "Screenshot 2026-02-13 at 7.33.56 AM.png",
        description: "File Request - uploaders, reviewers, sequential order",
      },
      {
        file: "Screenshot 2026-02-13 at 7.34.02 AM.png",
        description: "Approval - assignee selection with sequential order",
      },
    ],
  },
};

// Key UI patterns to check (from screenshot-categories.md)
export const UI_PATTERNS = {
  VERTICAL_TIMELINE: "Tasks connected by vertical line with numbered circles",
  SECTION_GROUPING: "Tasks organized into collapsible sections",
  YOUR_TURN_BADGE: "Green badge indicating user action required",
  PROGRESS_TRACKER: "Shows assignee completion status (e.g., '0/2', 'Completed')",
  ACTIVITY_LOG: "Chronological list of task events with timestamps",
  SPLIT_LAYOUT: "Flow/tasks on left, chat/meetings on right",
  ACTION_DETAILS_PANEL: "Slide-out panel for task details with type-specific UI",
};

/**
 * Get the path to a reference screenshot
 */
export function getReferencePath(filename: string): string {
  return path.join(process.cwd(), "../../Moxo SS", filename);
}

/**
 * Check if a reference screenshot exists
 */
export function referenceExists(filename: string): boolean {
  return fs.existsSync(getReferencePath(filename));
}

/**
 * List all reference screenshots by category
 */
export function listReferencesByCategory(): void {
  console.log("\n=== MOXO REFERENCE SCREENSHOTS ===\n");

  for (const [category, data] of Object.entries(REFERENCE_CATEGORIES)) {
    console.log(`\n## ${category}`);
    console.log(`   ${data.description}\n`);

    for (const screenshot of data.screenshots) {
      const exists = referenceExists(screenshot.file);
      const status = exists ? "[OK]" : "[MISSING]";
      console.log(`   ${status} ${screenshot.file}`);
      console.log(`           ${screenshot.description}`);
    }
  }
}

/**
 * Visual differences to check for each component
 */
export const VISUAL_CHECKLIST = {
  SECTION_CONTAINER: [
    "Full border around entire section (not just left accent)",
    "Border color matches status (blue=in_progress, green=completed, gray=not_started)",
    "Rounded corners (rounded-xl)",
  ],
  SECTION_HEADER: [
    "Title on the left (bold)",
    "Status badge with spinner icon (for in_progress)",
    "Progress counter 'X of Y'",
    "Three-dot menu button",
    "Collapse/expand chevron",
  ],
  TIMELINE: [
    "Inline circles left of each task (not separate sidebar)",
    "Green circle with checkmark for completed",
    "Blue circle with number for current",
    "Gray circle with number for upcoming",
    "Connecting lines between circles",
  ],
  TASK_CARD: [
    "No individual borders (inside section)",
    "Status as subtitle text below title",
    "Review button for Your Turn tasks",
    "Rounded-rectangle avatars on far right",
  ],
  STATUS_SUBTITLE: [
    "'Completed' in gray",
    "'Your Turn' in green (bold)",
    "'In Progress' in gray",
    "'Not Started' in gray",
  ],
};

/**
 * Print the visual checklist for manual verification
 */
export function printVisualChecklist(): void {
  console.log("\n=== VISUAL VERIFICATION CHECKLIST ===\n");

  for (const [component, items] of Object.entries(VISUAL_CHECKLIST)) {
    console.log(`\n## ${component}`);
    for (const item of items) {
      console.log(`   [ ] ${item}`);
    }
  }
}
