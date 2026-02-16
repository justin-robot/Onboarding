// Only enforce server-only in Next.js context (not for migrations)
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { Kysely } from "kysely";
import { NeonDialect } from "kysely-neon";
import type { Database } from "./schemas/main";

// Configure PlanetScale HTTP mode (instead of WebSockets)
// https://planetscale.com/changelog/neon-serverless-driver-http-mode
neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;

// Get database URL based on environment
const getDatabaseUrl = (env?: "dev" | "prod") => {
  if (env === "prod" || process.env.NODE_ENV === "production") {
    return process.env.DATABASE_URL_PROD;
  }
  return process.env.DATABASE_URL_DEV;
};

// Create database instance with HTTP mode (no WebSockets)
const createDb = (url?: string) => {
  const connectionString = url || getDatabaseUrl();

  if (!connectionString) {
    throw new Error(
      `Database URL is not defined. Please set DATABASE_URL_${
        process.env.NODE_ENV === "production" ? "PROD" : "DEV"
      }`
    );
  }

  return new Kysely<Database>({
    dialect: new NeonDialect({
      neon: neon(connectionString),
    }),
  });
};

// Export main database instance
export const database = createDb();

// Export Pool for BetterAuth (HTTP mode, no WebSocket connections)
export const pool = new Pool({ 
  connectionString: getDatabaseUrl() 
});

// Export createDb for migrations
export { createDb };
export * from "./schemas/main";

// Export services
export { workspaceService } from "./services/workspace";
export type { WorkspaceWithNested, SectionWithTasks, WorkspaceWithNestedAndLock } from "./services/workspace";

export { sectionService } from "./services/section";
export type { SectionProgress, SectionStatus, SectionWithStatus } from "./services/section";

export { taskService } from "./services/task";
export type { TaskWithLockStatus, TaskWithConfig, TaskFull, TaskConfig } from "./services/task";

export { dependencyService, CircularDependencyError } from "./services/dependency";

export { configService } from "./services/config";

export { formService } from "./services/form";
export type { FormPageWithElements, FormConfigWithPages } from "./services/form";

export { completionService } from "./services/completion";
export type { CompletionResult } from "./services/completion";

export { cascadeService } from "./services/cascade";

export { memberService } from "./services/member";
export type { MemberRole } from "./services/member";

export { assigneeService } from "./services/assignee";
export type { AssignResult } from "./services/assignee";

export { invitationService } from "./services/invitation";
export type { CreateInvitationResult, RedeemInvitationResult } from "./services/invitation";

export { auditLogService } from "./services/auditLog";
export type { AuditEventType, AuditSource, LogEventInput, AuditQueryOptions, AuditContext } from "./services/auditLog";

export type { NotificationContext, TriggerWorkflowOptions, TriggerResult } from "./services/notificationContext";

export { dueDateReminderService } from "./services/dueDateReminder";
export type { TaskDueInfo, ReminderResult } from "./services/dueDateReminder";

export { submissionService } from "./services/submission";
export type { SubmissionWithResponses, FieldValue } from "./services/submission";

export { buildFormValidationSchema, validateSubmission } from "./services/form-validation";

export { fileService } from "./services/file";
export type { PresignedUploadResult, ConfirmUploadOptions, FileWithUrl } from "./services/file";

export { thumbnailService, supportsThumbnail } from "./services/thumbnail";
export type { ThumbnailResult } from "./services/thumbnail";

// NOTE: ablyService is NOT exported here to avoid bundling issues with Next.js
// Import directly from "./services/ably" in server-only code (API routes)
// export { ablyService, CHANNELS, WORKSPACE_EVENTS, CHAT_EVENTS, USER_EVENTS } from "./services/ably";
// export type { AblyTokenRequest, WorkspaceEvent, ChatEvent, UserEvent } from "./services/ably";

export { chatService } from "./services/chat";
export type { SendMessageOptions, MessageWithUser, PaginatedMessages } from "./services/chat";

export { commentService } from "./services/comment";
export type { CreateCommentOptions, CommentWithUser } from "./services/comment";

export { signNowService } from "./services/signnow";
export type { PushDocumentResult } from "./services/signnow";

export { signNowWebhookService, verifySignature } from "./services/signnowWebhook";
export type { SignNowEventType, SignNowWebhookPayload, WebhookHandlerResult } from "./services/signnowWebhook";

export { googleCalendarService } from "./services/googleCalendar";
export type { WorkspaceIntegration, IntegrationProvider } from "./schemas/main";

export { accessService, AccessDeniedError, WorkspaceNotFoundError, NotWorkspaceMemberError, InsufficientPermissionsError } from "./services/access";

export { meetingReminderService } from "./services/meetingReminder";
export type { UpcomingMeeting, MeetingReminderResult } from "./services/meetingReminder";
