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

export interface ApprovalRequestedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  requestedBy?: string;
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
  | ApprovalRequestedData
  | CommentAddedData
  | ESignReadyData
  | MeetingStartingData;

// Workflow IDs used in database services
export type NotificationWorkflowId =
  | "task-assigned"
  | "task-your-turn"
  | "approval-requested"
  | "comment-added"
  | "esign-ready"
  | "meeting-starting";

// Trigger options
export interface TriggerWorkflowOptions {
  workflowId: NotificationWorkflowId;
  recipientId: string;
  data: NotificationWorkflowData;
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
