// Only enforce server-only in Next.js context (not for tests)
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

import { Knock } from "@knocklabs/node";

const knockSecretKey = process.env.KNOCK_SECRET_API_KEY;

if (!knockSecretKey) {
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

// Server-side notification service
export {
  notificationService,
  createNotificationService,
  getNotificationService,
} from "./service";

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
