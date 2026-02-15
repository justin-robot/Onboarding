import type { Generated, Insertable, Selectable, Updateable } from "kysely";

// =====================
// DATABASE INTERFACE
// =====================

export interface Database {
  // Auth tables (existing)
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  audit_log: AuditLogTable;

  // Moxo core tables
  workspace: WorkspaceTable;
  workspace_member: WorkspaceMemberTable;
  section: SectionTable;
  task: TaskTable;
  task_dependency: TaskDependencyTable;
  task_assignee: TaskAssigneeTable;
  comment: CommentTable;
  message: MessageTable;
  file: FileTable;
  notification: NotificationTable;
  reminder: ReminderTable;
  pending_invitation: PendingInvitationTable;

  // Task type tables
  form_config: FormConfigTable;
  form_page: FormPageTable;
  form_element: FormElementTable;
  form_submission: FormSubmissionTable;
  form_field_response: FormFieldResponseTable;
  acknowledgement_config: AcknowledgementConfigTable;
  acknowledgement: AcknowledgementTable;
  time_booking_config: TimeBookingConfigTable;
  booking: BookingTable;
  esign_config: ESignConfigTable;
  file_request_config: FileRequestConfigTable;
  approval_config: ApprovalConfigTable;
  approver: ApproverTable;

  // Moxo audit log (separate from auth audit_log)
  moxo_audit_log_entry: MoxoAuditLogEntryTable;

  // Integrations
  workspace_integration: WorkspaceIntegrationTable;
}

// =====================
// AUTH TABLES (existing)
// =====================

export interface UserTable {
  id: Generated<string>;
  name: string;
  username: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: "admin" | "account_manager" | "user" | null;
  communications: boolean | null;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface SessionTable {
  id: Generated<string>;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface AccountTable {
  id: Generated<string>;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  idToken: string | null;
  password: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface VerificationTable {
  id: Generated<string>;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface AuditLogTable {
  id: Generated<string>;
  userId: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: Generated<Date>;
}

// =====================
// MOXO CORE TABLES
// =====================

export interface WorkspaceTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  dueDate: Date | null;
  deletedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface WorkspaceMemberTable {
  id: Generated<string>;
  workspaceId: string;
  userId: string;
  role: "admin" | "account_manager" | "user";
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface SectionTable {
  id: Generated<string>;
  workspaceId: string;
  title: string;
  position: number;
  deletedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type TaskType = "FORM" | "ACKNOWLEDGEMENT" | "TIME_BOOKING" | "E_SIGN" | "FILE_REQUEST" | "APPROVAL";
export type TaskStatus = "not_started" | "in_progress" | "completed";
export type CompletionRule = "any" | "all";
export type DueDateType = "absolute" | "relative";

export interface TaskTable {
  id: Generated<string>;
  sectionId: string;
  title: string;
  description: string | null;
  position: number;
  type: TaskType;
  status: Generated<TaskStatus>;
  completionRule: Generated<CompletionRule>;
  dueDateType: DueDateType | null;
  dueDateValue: Date | null;
  deletedAt: Date | null;
  completedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type DependencyType = "unlock" | "date_anchor" | "both";

export interface TaskDependencyTable {
  id: Generated<string>;
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
  offsetDays: number | null;
  createdAt: Generated<Date>;
}

export type AssigneeStatus = "pending" | "completed";

export interface TaskAssigneeTable {
  id: Generated<string>;
  taskId: string;
  userId: string;
  status: Generated<AssigneeStatus>;
  completedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface CommentTable {
  id: Generated<string>;
  taskId: string;
  userId: string;
  content: string;
  deletedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type MessageType = "text" | "annotation" | "system";

export interface MessageTable {
  id: Generated<string>;
  workspaceId: string;
  userId: string;
  content: string;
  type: Generated<MessageType>;
  attachmentIds: string[] | null;
  referencedTaskId: string | null;
  referencedFileId: string | null;
  deletedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type FileSourceType = "upload" | "task_attachment" | "chat";

export interface FileTable {
  id: Generated<string>;
  workspaceId: string;
  uploadedBy: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  thumbnailKey: string | null;
  sourceType: FileSourceType;
  sourceTaskId: string | null;
  previousVersionId: string | null;
  deletedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface NotificationTable {
  id: Generated<string>;
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: Generated<boolean>;
  readAt: Date | null;
  createdAt: Generated<Date>;
}

export type ReminderType = "before_due" | "after_due" | "recurring";

export interface ReminderTable {
  id: Generated<string>;
  workspaceId: string;
  taskId: string | null;
  type: ReminderType;
  offsetMinutes: number;
  enabled: Generated<boolean>;
  lastSentAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface PendingInvitationTable {
  id: Generated<string>;
  workspaceId: string;
  email: string;
  role: "admin" | "account_manager" | "user";
  token: string;
  expiresAt: Date;
  invitedBy: string;
  createdAt: Generated<Date>;
}

// =====================
// FORM TASK TABLES
// =====================

export interface FormConfigTable {
  id: Generated<string>;
  taskId: string;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface FormPageTable {
  id: Generated<string>;
  formConfigId: string;
  title: string | null;
  position: number;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type FormElementType = "text" | "textarea" | "select" | "radio" | "checkbox" | "file" | "date" | "number" | "email" | "phone" | "heading" | "paragraph" | "divider" | "image";

export interface FormElementTable {
  id: Generated<string>;
  formPageId: string;
  type: FormElementType;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  required: Generated<boolean>;
  position: number;
  options: Record<string, unknown>[] | null; // array of {value, label}
  validation: Record<string, unknown> | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type FormSubmissionStatus = "draft" | "submitted";

export interface FormSubmissionTable {
  id: Generated<string>;
  formConfigId: string;
  userId: string;
  status: Generated<FormSubmissionStatus>;
  submittedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface FormFieldResponseTable {
  id: Generated<string>;
  submissionId: string;
  elementId: string;
  value: unknown; // string | string[] | file_id
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// =====================
// ACKNOWLEDGEMENT TASK TABLES
// =====================

export interface AcknowledgementConfigTable {
  id: Generated<string>;
  taskId: string;
  instructions: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type AcknowledgementStatus = "pending" | "acknowledged";

export interface AcknowledgementTable {
  id: Generated<string>;
  configId: string;
  userId: string;
  status: Generated<AcknowledgementStatus>;
  acknowledgedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// =====================
// TIME BOOKING TASK TABLES
// =====================

export interface TimeBookingConfigTable {
  id: Generated<string>;
  taskId: string;
  bookingLink: string;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type BookingStatus = "not_started" | "booked";

export interface BookingTable {
  id: Generated<string>;
  configId: string;
  userId: string;
  status: Generated<BookingStatus>;
  calendarEventId: string | null;
  meetLink: string | null;
  bookedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// =====================
// E-SIGN TASK TABLES
// =====================

export type ESignStatus = "pending" | "sent" | "viewed" | "signed" | "completed" | "declined" | "cancelled";
export type ESignProvider = "signnow";

export interface ESignConfigTable {
  id: Generated<string>;
  taskId: string;
  fileId: string; // Source file to be signed
  signerEmail: string; // Who should sign
  provider: Generated<ESignProvider>;
  providerDocumentId: string | null; // Set after push to provider
  providerSigningUrl: string | null; // Set after push to provider
  status: Generated<ESignStatus>;
  completedDocumentUrl: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// =====================
// FILE REQUEST TASK TABLES
// =====================

export interface FileRequestConfigTable {
  id: Generated<string>;
  taskId: string;
  targetFolderId: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// =====================
// APPROVAL TASK TABLES
// =====================

export interface ApprovalConfigTable {
  id: Generated<string>;
  taskId: string;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApproverTable {
  id: Generated<string>;
  configId: string;
  userId: string;
  status: Generated<ApprovalStatus>;
  decidedAt: Date | null;
  comments: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// =====================
// MOXO AUDIT LOG TABLE
// =====================

export interface MoxoAuditLogEntryTable {
  id: Generated<string>;
  workspaceId: string;
  taskId: string | null;
  eventType: string;
  actorId: string;
  metadata: Record<string, unknown> | null;
  source: string;
  ipAddress: string | null;
  createdAt: Generated<Date>;
  // No updatedAt - audit logs are immutable
}

// =====================
// WORKSPACE INTEGRATION TABLE
// =====================

export type IntegrationProvider = "google_calendar";

export interface WorkspaceIntegrationTable {
  id: Generated<string>;
  workspaceId: string;
  provider: IntegrationProvider;
  accessToken: string | null; // Encrypted
  refreshToken: string | null; // Encrypted
  tokenExpiresAt: Date | null;
  scope: string | null;
  connectedBy: string; // User who connected the integration
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// =====================
// TYPE EXPORTS
// =====================

// Auth types
export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;

export type Session = Selectable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type SessionUpdate = Updateable<SessionTable>;

export type Account = Selectable<AccountTable>;
export type NewAccount = Insertable<AccountTable>;
export type AccountUpdate = Updateable<AccountTable>;

export type Verification = Selectable<VerificationTable>;
export type NewVerification = Insertable<VerificationTable>;
export type VerificationUpdate = Updateable<VerificationTable>;

export type AuditLog = Selectable<AuditLogTable>;
export type NewAuditLog = Insertable<AuditLogTable>;
export type AuditLogUpdate = Updateable<AuditLogTable>;

// Moxo core types
export type Workspace = Selectable<WorkspaceTable>;
export type NewWorkspace = Insertable<WorkspaceTable>;
export type WorkspaceUpdate = Updateable<WorkspaceTable>;

export type WorkspaceMember = Selectable<WorkspaceMemberTable>;
export type NewWorkspaceMember = Insertable<WorkspaceMemberTable>;
export type WorkspaceMemberUpdate = Updateable<WorkspaceMemberTable>;

export type Section = Selectable<SectionTable>;
export type NewSection = Insertable<SectionTable>;
export type SectionUpdate = Updateable<SectionTable>;

export type Task = Selectable<TaskTable>;
export type NewTask = Insertable<TaskTable>;
export type TaskUpdate = Updateable<TaskTable>;

export type TaskDependency = Selectable<TaskDependencyTable>;
export type NewTaskDependency = Insertable<TaskDependencyTable>;
export type TaskDependencyUpdate = Updateable<TaskDependencyTable>;

export type TaskAssignee = Selectable<TaskAssigneeTable>;
export type NewTaskAssignee = Insertable<TaskAssigneeTable>;
export type TaskAssigneeUpdate = Updateable<TaskAssigneeTable>;

export type Comment = Selectable<CommentTable>;
export type NewComment = Insertable<CommentTable>;
export type CommentUpdate = Updateable<CommentTable>;

export type Message = Selectable<MessageTable>;
export type NewMessage = Insertable<MessageTable>;
export type MessageUpdate = Updateable<MessageTable>;

export type File = Selectable<FileTable>;
export type NewFile = Insertable<FileTable>;
export type FileUpdate = Updateable<FileTable>;

export type Notification = Selectable<NotificationTable>;
export type NewNotification = Insertable<NotificationTable>;
export type NotificationUpdate = Updateable<NotificationTable>;

export type Reminder = Selectable<ReminderTable>;
export type NewReminder = Insertable<ReminderTable>;
export type ReminderUpdate = Updateable<ReminderTable>;

export type PendingInvitation = Selectable<PendingInvitationTable>;
export type NewPendingInvitation = Insertable<PendingInvitationTable>;
export type PendingInvitationUpdate = Updateable<PendingInvitationTable>;

// Form types
export type FormConfig = Selectable<FormConfigTable>;
export type NewFormConfig = Insertable<FormConfigTable>;
export type FormConfigUpdate = Updateable<FormConfigTable>;

export type FormPage = Selectable<FormPageTable>;
export type NewFormPage = Insertable<FormPageTable>;
export type FormPageUpdate = Updateable<FormPageTable>;

export type FormElement = Selectable<FormElementTable>;
export type NewFormElement = Insertable<FormElementTable>;
export type FormElementUpdate = Updateable<FormElementTable>;

export type FormSubmission = Selectable<FormSubmissionTable>;
export type NewFormSubmission = Insertable<FormSubmissionTable>;
export type FormSubmissionUpdate = Updateable<FormSubmissionTable>;

export type FormFieldResponse = Selectable<FormFieldResponseTable>;
export type NewFormFieldResponse = Insertable<FormFieldResponseTable>;
export type FormFieldResponseUpdate = Updateable<FormFieldResponseTable>;

// Acknowledgement types
export type AcknowledgementConfig = Selectable<AcknowledgementConfigTable>;
export type NewAcknowledgementConfig = Insertable<AcknowledgementConfigTable>;
export type AcknowledgementConfigUpdate = Updateable<AcknowledgementConfigTable>;

export type Acknowledgement = Selectable<AcknowledgementTable>;
export type NewAcknowledgement = Insertable<AcknowledgementTable>;
export type AcknowledgementUpdate = Updateable<AcknowledgementTable>;

// Time booking types
export type TimeBookingConfig = Selectable<TimeBookingConfigTable>;
export type NewTimeBookingConfig = Insertable<TimeBookingConfigTable>;
export type TimeBookingConfigUpdate = Updateable<TimeBookingConfigTable>;

export type Booking = Selectable<BookingTable>;
export type NewBooking = Insertable<BookingTable>;
export type BookingUpdate = Updateable<BookingTable>;

// E-sign types
export type ESignConfig = Selectable<ESignConfigTable>;
export type NewESignConfig = Insertable<ESignConfigTable>;
export type ESignConfigUpdate = Updateable<ESignConfigTable>;

// File request types
export type FileRequestConfig = Selectable<FileRequestConfigTable>;
export type NewFileRequestConfig = Insertable<FileRequestConfigTable>;
export type FileRequestConfigUpdate = Updateable<FileRequestConfigTable>;

// Approval types
export type ApprovalConfig = Selectable<ApprovalConfigTable>;
export type NewApprovalConfig = Insertable<ApprovalConfigTable>;
export type ApprovalConfigUpdate = Updateable<ApprovalConfigTable>;

export type Approver = Selectable<ApproverTable>;
export type NewApprover = Insertable<ApproverTable>;
export type ApproverUpdate = Updateable<ApproverTable>;

// Moxo audit log types (no Update type - immutable)
export type MoxoAuditLogEntry = Selectable<MoxoAuditLogEntryTable>;
export type NewMoxoAuditLogEntry = Insertable<MoxoAuditLogEntryTable>;

// Workspace integration types
export type WorkspaceIntegration = Selectable<WorkspaceIntegrationTable>;
export type NewWorkspaceIntegration = Insertable<WorkspaceIntegrationTable>;
export type WorkspaceIntegrationUpdate = Updateable<WorkspaceIntegrationTable>;
