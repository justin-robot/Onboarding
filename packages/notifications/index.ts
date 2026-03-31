import { Knock } from "@knocklabs/node";

// Only log warning on server side, not in browser
const isServer = typeof window === "undefined";
const knockSecretKey = process.env.KNOCK_SECRET_API_KEY;

if (isServer && !knockSecretKey) {
  console.warn("KNOCK_SECRET_API_KEY not configured. Notification features will be disabled.");
}

/**
 * Create a Knock client instance
 */
export const createKnockClient = (): Knock | null => {
  if (!knockSecretKey) {
    return null;
  }

  return new Knock({ apiKey: knockSecretKey });
};

/**
 * Get Knock client instance
 */
export const getKnockClient = () => {
  return createKnockClient();
};

// Client-side exports (must be in separate files due to "use client")
export * from "./components/provider";
export * from "./components/trigger";
export * from "./components/workspace-provider";

// Server-side notification service
export {
  notificationService,
  createNotificationService,
  getNotificationService,
} from "./service";

// Preferences service
export {
  getUserPreferences,
  updateUserPreferences,
  NOTIFICATION_CATEGORIES,
  DEFAULT_PREFERENCES,
} from "./preferences";

export type {
  NotificationCategory,
  NotificationPreferences,
} from "./preferences";

// Export all notification types
export type {
  NotificationWorkflow,
  NotificationService,
  TriggerWorkflowOptions,
  TriggerResult,
  TaskAssignedData,
  TaskYourTurnData,
  DueDateApproachingData,
  DueDatePassedData,
  DueDateClearedData,
  ApprovalRequestedData,
  ApprovalRejectedData,
  ESignReadyData,
  FileReadyForReviewData,
  FileRejectedData,
  MeetingStartingData,
  CommentAddedData,
  WorkflowDataMap,
} from "./service";

// Re-export Knock types
export type { Knock } from "@knocklabs/node";
