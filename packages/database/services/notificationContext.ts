// Notification context for service operations
// This allows services to trigger notifications without direct dependency on the notification package

// Workflow data types (matching the notification service)
export interface TaskAssignedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  assignedBy?: string;
}

export interface TaskYourTurnData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
}

export interface DueDateApproachingData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  dueDate: string; // ISO date string
  hoursRemaining: number;
}

export interface DueDatePassedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  hoursOverdue: number;
}

export interface DueDateClearedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  reason: string;
}

export interface ApprovalRequestedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  requestedBy?: string;
}

export interface ApprovalRejectedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  rejectedBy: string;
  rejectionReason?: string;
}

export interface CommentAddedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  commentBy: string;
  commentPreview: string;
}

export interface ESignReadyData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  documentName: string;
}

export interface FileReadyForReviewData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  fileName: string;
  uploadedBy: string;
}

export interface FileRejectedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  fileName: string;
  rejectedBy: string;
  rejectionReason?: string;
}

export interface MeetingStartingData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  meetingLink: string;
  startsIn: number; // minutes
}

// Union of workflow data types used in database services
export type NotificationWorkflowData =
  | TaskAssignedData
  | TaskYourTurnData
  | DueDateApproachingData
  | DueDatePassedData
  | DueDateClearedData
  | ApprovalRequestedData
  | ApprovalRejectedData
  | CommentAddedData
  | ESignReadyData
  | FileReadyForReviewData
  | FileRejectedData
  | MeetingStartingData;

// Workflow IDs used in database services (all 12 workflows)
export type NotificationWorkflowId =
  | "task-assigned"
  | "task-your-turn"
  | "due-date-approaching"
  | "due-date-passed"
  | "due-date-cleared"
  | "approval-requested"
  | "approval-rejected"
  | "comment-added"
  | "esign-ready"
  | "file-ready-for-review"
  | "file-rejected"
  | "meeting-starting";

// Map workflow to data type for type safety
export interface WorkflowDataMap {
  "task-assigned": TaskAssignedData;
  "task-your-turn": TaskYourTurnData;
  "due-date-approaching": DueDateApproachingData;
  "due-date-passed": DueDatePassedData;
  "due-date-cleared": DueDateClearedData;
  "approval-requested": ApprovalRequestedData;
  "approval-rejected": ApprovalRejectedData;
  "comment-added": CommentAddedData;
  "esign-ready": ESignReadyData;
  "file-ready-for-review": FileReadyForReviewData;
  "file-rejected": FileRejectedData;
  "meeting-starting": MeetingStartingData;
}

// Trigger options
export interface TriggerWorkflowOptions<W extends NotificationWorkflowId = NotificationWorkflowId> {
  workflowId: W;
  recipientId: string;
  data: W extends keyof WorkflowDataMap ? WorkflowDataMap[W] : NotificationWorkflowData;
  tenant?: string;
}

// Trigger result
export interface TriggerResult {
  success: boolean;
  workflowRunId?: string;
  error?: string;
}

// Notification context interface
export interface NotificationContext {
  triggerWorkflow: (options: TriggerWorkflowOptions) => Promise<TriggerResult>;
}
