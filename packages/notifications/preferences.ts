import { Knock } from "@knocklabs/node";

// Notification category groupings for the preferences UI
export const NOTIFICATION_CATEGORIES = {
  tasks: {
    label: "Tasks",
    description: "Task assignments and approvals",
    workflows: [
      "task-assigned",
      "task-your-turn",
      "approval-requested",
      "approval-rejected",
      "comment-added",
    ] as const,
  },
  dueDates: {
    label: "Due Dates",
    description: "Due date reminders and updates",
    workflows: [
      "due-date-approaching",
      "due-date-passed",
      "due-date-cleared",
    ] as const,
  },
  documents: {
    label: "Documents",
    description: "E-sign and file requests",
    workflows: [
      "esign-ready",
      "file-ready-for-review",
      "file-rejected",
    ] as const,
  },
  meetings: {
    label: "Meetings",
    description: "Meeting reminders",
    workflows: ["meeting-starting"] as const,
  },
} as const;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

// User-friendly preferences structure (for API/UI)
export interface NotificationPreferences {
  tasks: boolean;
  dueDates: boolean;
  documents: boolean;
  meetings: boolean;
}

// Default preferences - all enabled
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  tasks: true,
  dueDates: true,
  documents: true,
  meetings: true,
};

/**
 * Get user's notification preferences from Knock
 */
export async function getUserPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const knockSecretKey = process.env.KNOCK_SECRET_API_KEY;

  if (!knockSecretKey) {
    console.warn(
      "[preferences] Knock not configured. Returning default preferences."
    );
    return DEFAULT_PREFERENCES;
  }

  const knock = new Knock({ apiKey: knockSecretKey });

  try {
    // Use "default" preference set ID
    const preferenceSet = await knock.users.getPreferences(userId, "default");

    // Convert Knock's workflow preferences to our category structure
    const preferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };

    // Check each category - if ANY workflow in the category is disabled, mark category as disabled
    for (const [category, config] of Object.entries(NOTIFICATION_CATEGORIES)) {
      const categoryKey = category as NotificationCategory;
      const workflows = config.workflows;

      // Check if all workflows in this category are enabled
      const allEnabled = workflows.every((workflow) => {
        const workflowPref = preferenceSet.workflows?.[workflow];
        // If no preference set, assume enabled (default)
        if (!workflowPref) return true;
        // If it's a boolean, use it directly
        if (typeof workflowPref === "boolean") return workflowPref;
        // Check channel_types.in_app_feed if it exists (it's an object)
        const inAppFeed = workflowPref.channel_types?.in_app_feed;
        if (typeof inAppFeed === "boolean") return inAppFeed;
        return true;
      });

      preferences[categoryKey] = allEnabled;
    }

    return preferences;
  } catch (error) {
    console.error("[preferences] Failed to get preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user's notification preferences in Knock
 */
export async function updateUserPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  const knockSecretKey = process.env.KNOCK_SECRET_API_KEY;

  if (!knockSecretKey) {
    console.warn(
      "[preferences] Knock not configured. Cannot update preferences."
    );
    return preferences;
  }

  const knock = new Knock({ apiKey: knockSecretKey });

  try {
    // Build the workflows preferences object
    const workflows: Record<string, { channel_types: { in_app_feed: boolean } }> = {};

    for (const [category, config] of Object.entries(NOTIFICATION_CATEGORIES)) {
      const categoryKey = category as NotificationCategory;
      const enabled = preferences[categoryKey];

      for (const workflow of config.workflows) {
        workflows[workflow] = {
          channel_types: {
            in_app_feed: enabled,
          },
        };
      }
    }

    // Use "default" preference set ID and merge strategy
    await knock.users.setPreferences(userId, "default", {
      workflows,
      __persistence_strategy__: "merge",
    });

    console.log(`[preferences] Updated preferences for user: ${userId}`);
    return preferences;
  } catch (error) {
    console.error("[preferences] Failed to update preferences:", error);
    throw error;
  }
}
