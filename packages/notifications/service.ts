import { Knock } from "@knocklabs/node";

// All 12 notification workflow types
export type NotificationWorkflow =
  | "task-assigned"
  | "task-your-turn"
  | "due-date-approaching"
  | "due-date-passed"
  | "due-date-cleared"
  | "approval-requested"
  | "approval-rejected"
  | "esign-ready"
  | "file-ready-for-review"
  | "file-rejected"
  | "meeting-starting"
  | "comment-added";

// Workflow-specific data types
export interface TaskAssignedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  assignedBy: string;
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
  requestedBy: string;
}

export interface ApprovalRejectedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  rejectedBy: string;
  rejectionReason?: string;
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

export interface CommentAddedData {
  workspaceId: string;
  workspaceName: string;
  taskId: string;
  taskTitle: string;
  commentBy: string;
  commentPreview: string;
}

// Map workflow to data type
export interface WorkflowDataMap {
  "task-assigned": TaskAssignedData;
  "task-your-turn": TaskYourTurnData;
  "due-date-approaching": DueDateApproachingData;
  "due-date-passed": DueDatePassedData;
  "due-date-cleared": DueDateClearedData;
  "approval-requested": ApprovalRequestedData;
  "approval-rejected": ApprovalRejectedData;
  "esign-ready": ESignReadyData;
  "file-ready-for-review": FileReadyForReviewData;
  "file-rejected": FileRejectedData;
  "meeting-starting": MeetingStartingData;
  "comment-added": CommentAddedData;
}

// Trigger options
export interface TriggerWorkflowOptions<W extends NotificationWorkflow> {
  workflowId: W;
  recipientId: string;
  recipientName?: string; // For inline user identification
  recipientEmail?: string; // For inline user identification
  data: WorkflowDataMap[W];
  actorId?: string; // Who triggered the notification (for attribution)
  tenant?: string; // For multi-tenant support (workspace ID)
}

// Result type
export interface TriggerResult {
  success: boolean;
  workflowRunId?: string;
  error?: string;
}

// Notification service
export interface NotificationService {
  triggerWorkflow<W extends NotificationWorkflow>(
    options: TriggerWorkflowOptions<W>
  ): Promise<TriggerResult>;
}

// Create the service
export function createNotificationService(
  knockClient: Knock | null
): NotificationService {
  return {
    async triggerWorkflow<W extends NotificationWorkflow>(
      options: TriggerWorkflowOptions<W>
    ): Promise<TriggerResult> {
      if (!knockClient) {
        console.warn(
          `[notifications] Knock not configured. Skipping workflow: ${options.workflowId}`
        );
        return { success: false, error: "Knock client not configured" };
      }

      try {
        console.log(
          `[notifications] Triggering workflow: ${options.workflowId} for user: ${options.recipientId}`
        );

        // Use inline identification - Knock will auto-create the user if they don't exist
        const recipient = options.recipientName
          ? { id: options.recipientId, name: options.recipientName, email: options.recipientEmail }
          : options.recipientId;

        const result = await knockClient.workflows.trigger(options.workflowId, {
          recipients: [recipient],
          data: options.data as unknown as Record<string, unknown>,
          actor: options.actorId,
          tenant: options.tenant,
        });

        console.log(
          `[notifications] Successfully triggered: ${options.workflowId}, runId: ${result.workflow_run_id}`
        );

        return {
          success: true,
          workflowRunId: result.workflow_run_id,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[notifications] Failed to trigger workflow ${options.workflowId}:`,
          message
        );
        return { success: false, error: message };
      }
    },
  };
}

// Singleton instance getter
let serviceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!serviceInstance) {
    const knockSecretKey = process.env.KNOCK_SECRET_API_KEY;
    console.log(`[notifications] Initializing service. Secret key present: ${!!knockSecretKey}`);
    const knockClient = knockSecretKey
      ? new Knock({ apiKey: knockSecretKey })
      : null;
    serviceInstance = createNotificationService(knockClient);
  }
  return serviceInstance;
}

// Export for convenience
export const notificationService = {
  async triggerWorkflow<W extends NotificationWorkflow>(
    options: TriggerWorkflowOptions<W>
  ): Promise<TriggerResult> {
    return getNotificationService().triggerWorkflow(options);
  },
};
