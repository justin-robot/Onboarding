import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNotificationService,
  type NotificationWorkflow,
  type TaskAssignedData,
  type TaskYourTurnData,
  type DueDateApproachingData,
  type DueDatePassedData,
  type DueDateClearedData,
  type ApprovalRequestedData,
  type ApprovalRejectedData,
  type ESignReadyData,
  type FileReadyForReviewData,
  type FileRejectedData,
  type MeetingStartingData,
  type CommentAddedData,
} from "../service";

// Mock Knock client
function createMockKnockClient() {
  return {
    workflows: {
      trigger: vi.fn().mockResolvedValue({ workflow_run_id: "mock-run-123" }),
    },
  };
}

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("triggerWorkflow", () => {
    it("should return error when Knock client is not configured", async () => {
      const service = createNotificationService(null);

      const result = await service.triggerWorkflow({
        workflowId: "task-assigned",
        recipientId: "user-123",
        data: {
          workspaceId: "ws-1",
          workspaceName: "Test Workspace",
          taskId: "task-1",
          taskTitle: "Test Task",
          assignedBy: "Admin User",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Knock client not configured");
    });

    it("should call Knock API with correct parameters", async () => {
      const mockClient = createMockKnockClient();
      const service = createNotificationService(mockClient as never);

      const data: TaskAssignedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Test Task",
        assignedBy: "Admin User",
      };

      const result = await service.triggerWorkflow({
        workflowId: "task-assigned",
        recipientId: "user-123",
        data,
        actorId: "admin-1",
        tenant: "ws-1",
      });

      expect(result.success).toBe(true);
      expect(result.workflowRunId).toBe("mock-run-123");
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith("task-assigned", {
        recipients: ["user-123"],
        data,
        actor: "admin-1",
        tenant: "ws-1",
      });
    });

    it("should handle Knock API errors gracefully", async () => {
      const mockClient = createMockKnockClient();
      mockClient.workflows.trigger.mockRejectedValue(new Error("API rate limit exceeded"));
      const service = createNotificationService(mockClient as never);

      const result = await service.triggerWorkflow({
        workflowId: "task-assigned",
        recipientId: "user-123",
        data: {
          workspaceId: "ws-1",
          workspaceName: "Test Workspace",
          taskId: "task-1",
          taskTitle: "Test Task",
          assignedBy: "Admin User",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("API rate limit exceeded");
    });
  });

  describe("workflow types", () => {
    let mockClient: ReturnType<typeof createMockKnockClient>;
    let service: ReturnType<typeof createNotificationService>;

    beforeEach(() => {
      mockClient = createMockKnockClient();
      service = createNotificationService(mockClient as never);
    });

    it("should support task-assigned workflow", async () => {
      const data: TaskAssignedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Review Document",
        assignedBy: "Admin",
      };

      const result = await service.triggerWorkflow({
        workflowId: "task-assigned",
        recipientId: "user-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "task-assigned",
        expect.objectContaining({ data })
      );
    });

    it("should support task-your-turn workflow", async () => {
      const data: TaskYourTurnData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Submit Form",
      };

      const result = await service.triggerWorkflow({
        workflowId: "task-your-turn",
        recipientId: "user-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "task-your-turn",
        expect.objectContaining({ data })
      );
    });

    it("should support due-date-approaching workflow", async () => {
      const data: DueDateApproachingData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Urgent Task",
        dueDate: "2024-12-25T10:00:00Z",
        hoursRemaining: 24,
      };

      const result = await service.triggerWorkflow({
        workflowId: "due-date-approaching",
        recipientId: "user-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "due-date-approaching",
        expect.objectContaining({ data })
      );
    });

    it("should support due-date-passed workflow", async () => {
      const data: DueDatePassedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Overdue Task",
        dueDate: "2024-12-20T10:00:00Z",
        hoursOverdue: 48,
      };

      const result = await service.triggerWorkflow({
        workflowId: "due-date-passed",
        recipientId: "user-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "due-date-passed",
        expect.objectContaining({ data })
      );
    });

    it("should support due-date-cleared workflow", async () => {
      const data: DueDateClearedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Flexible Task",
        reason: "Dependency task was deleted",
      };

      const result = await service.triggerWorkflow({
        workflowId: "due-date-cleared",
        recipientId: "user-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "due-date-cleared",
        expect.objectContaining({ data })
      );
    });

    it("should support approval-requested workflow", async () => {
      const data: ApprovalRequestedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Budget Approval",
        requestedBy: "John Doe",
      };

      const result = await service.triggerWorkflow({
        workflowId: "approval-requested",
        recipientId: "approver-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "approval-requested",
        expect.objectContaining({ data })
      );
    });

    it("should support approval-rejected workflow", async () => {
      const data: ApprovalRejectedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Budget Approval",
        rejectedBy: "Manager",
        rejectionReason: "Exceeds budget limit",
      };

      const result = await service.triggerWorkflow({
        workflowId: "approval-rejected",
        recipientId: "user-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "approval-rejected",
        expect.objectContaining({ data })
      );
    });

    it("should support esign-ready workflow", async () => {
      const data: ESignReadyData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Sign Contract",
        documentName: "Service Agreement.pdf",
      };

      const result = await service.triggerWorkflow({
        workflowId: "esign-ready",
        recipientId: "signer-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "esign-ready",
        expect.objectContaining({ data })
      );
    });

    it("should support file-ready-for-review workflow", async () => {
      const data: FileReadyForReviewData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Document Review",
        fileName: "report.pdf",
        uploadedBy: "Jane Smith",
      };

      const result = await service.triggerWorkflow({
        workflowId: "file-ready-for-review",
        recipientId: "reviewer-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "file-ready-for-review",
        expect.objectContaining({ data })
      );
    });

    it("should support file-rejected workflow", async () => {
      const data: FileRejectedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Document Upload",
        fileName: "report.pdf",
        rejectedBy: "Reviewer",
        rejectionReason: "File is corrupted",
      };

      const result = await service.triggerWorkflow({
        workflowId: "file-rejected",
        recipientId: "uploader-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "file-rejected",
        expect.objectContaining({ data })
      );
    });

    it("should support meeting-starting workflow", async () => {
      const data: MeetingStartingData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Team Sync",
        meetingLink: "https://meet.google.com/abc-defg-hij",
        startsIn: 15,
      };

      const result = await service.triggerWorkflow({
        workflowId: "meeting-starting",
        recipientId: "attendee-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "meeting-starting",
        expect.objectContaining({ data })
      );
    });

    it("should support comment-added workflow", async () => {
      const data: CommentAddedData = {
        workspaceId: "ws-1",
        workspaceName: "Test Workspace",
        taskId: "task-1",
        taskTitle: "Project Discussion",
        commentBy: "Team Member",
        commentPreview: "Great progress on the implementation...",
      };

      const result = await service.triggerWorkflow({
        workflowId: "comment-added",
        recipientId: "subscriber-1",
        data,
      });

      expect(result.success).toBe(true);
      expect(mockClient.workflows.trigger).toHaveBeenCalledWith(
        "comment-added",
        expect.objectContaining({ data })
      );
    });
  });

  describe("all 12 workflow types compile", () => {
    it("should have all 12 workflow types defined", () => {
      // Type-level test: ensure all workflows are accounted for
      const allWorkflows: NotificationWorkflow[] = [
        "task-assigned",
        "task-your-turn",
        "due-date-approaching",
        "due-date-passed",
        "due-date-cleared",
        "approval-requested",
        "approval-rejected",
        "esign-ready",
        "file-ready-for-review",
        "file-rejected",
        "meeting-starting",
        "comment-added",
      ];

      expect(allWorkflows).toHaveLength(12);
    });
  });
});
