// Services barrel export
// Mirrors the service exports that were previously in @repo/database

export { workspaceService } from "./workspace";
export type { WorkspaceWithNested, SectionWithTasks, WorkspaceWithNestedAndLock } from "./workspace";

export { sectionService } from "./section";
export type { SectionProgress, SectionStatus, SectionWithStatus } from "./section";

export { taskService } from "./task";
export type { TaskWithLockStatus, TaskWithConfig, TaskFull, TaskConfig } from "./task";

export { dependencyService, CircularDependencyError } from "./dependency";

export { configService } from "./config";

export { formService } from "./form";
export type { FormPageWithElements, FormConfigWithPages } from "./form";

export { completionService } from "./completion";
export type { CompletionResult } from "./completion";

export { cascadeService } from "./cascade";

export { memberService } from "./member";
export type { MemberRole } from "./member";

export { assigneeService } from "./assignee";
export type { AssignResult } from "./assignee";

export { invitationService } from "./invitation";
export type { CreateInvitationResult, RedeemInvitationResult } from "./invitation";

export { auditLogService } from "./auditLog";
export type { AuditEventType, AuditSource, LogEventInput, AuditQueryOptions, AuditContext } from "./auditLog";

export type { NotificationContext, TriggerWorkflowOptions, TriggerResult } from "./notificationContext";

export { dueDateReminderService } from "./dueDateReminder";
export type { TaskDueInfo, ReminderResult } from "./dueDateReminder";

export { submissionService } from "./submission";
export type { SubmissionWithResponses, FieldValue } from "./submission";

export { buildFormValidationSchema, validateSubmission } from "./form-validation";

export { fileService } from "./file";
export type { PresignedUploadResult, ConfirmUploadOptions, FileWithUrl } from "./file";

export { thumbnailService, supportsThumbnail } from "./thumbnail";
export type { ThumbnailResult } from "./thumbnail";

export { chatService } from "./chat";
export type { SendMessageOptions, MessageWithUser, PaginatedMessages } from "./chat";

export { commentService } from "./comment";
export type { CreateCommentOptions, CommentWithUser } from "./comment";

export { signNowService } from "./signnow";
export type { PushDocumentResult } from "./signnow";

export { signNowWebhookService, verifySignature } from "./signnowWebhook";
export type { SignNowEventType, SignNowWebhookPayload, WebhookHandlerResult } from "./signnowWebhook";

export { googleCalendarService } from "./googleCalendar";

export { accessService, AccessDeniedError, WorkspaceNotFoundError, NotWorkspaceMemberError, InsufficientPermissionsError } from "./access";

export { meetingReminderService } from "./meetingReminder";
export type { UpcomingMeeting, MeetingReminderResult } from "./meetingReminder";
