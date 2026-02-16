import { fileService, taskService, sectionService, workspaceService, assigneeService } from "@repo/database";
import { notificationService } from "@repo/notifications";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * POST /api/files/confirm - Confirm a file upload after uploading to S3
 *
 * Body: { key: string, taskId: string, name: string, mimeType: string, size: number }
 * Returns: File record
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    const body = await request.json();
    const { key, taskId, name, mimeType, size } = body;

    // Validate required fields
    if (!key || typeof key !== "string") {
      return errorResponse("key is required", 400);
    }
    if (!taskId || typeof taskId !== "string") {
      return errorResponse("taskId is required", 400);
    }
    if (!name || typeof name !== "string") {
      return errorResponse("name is required", 400);
    }
    if (!mimeType || typeof mimeType !== "string") {
      return errorResponse("mimeType is required", 400);
    }
    if (typeof size !== "number" || size <= 0) {
      return errorResponse("size must be a positive number", 400);
    }

    // Get task to find section and workspace
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get section to find workspace
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Confirm the upload and create file record
    const file = await fileService.confirmUpload({
      key,
      workspaceId: section.workspaceId,
      uploadedBy: user.id,
      name,
      mimeType,
      size,
      sourceType: "task_attachment",
      sourceTaskId: taskId,
      generateThumbnail: true,
    });

    // For FILE_REQUEST tasks, notify reviewers/admins about the new file (non-blocking)
    if (task.type === "FILE_REQUEST") {
      (async () => {
        try {
          const workspace = await workspaceService.getById(section.workspaceId);
          if (!workspace) return;

          // Get all assignees (excluding the uploader)
          const assignees = await assigneeService.getByTaskId(taskId);
          const reviewers = assignees.filter((a) => a.userId !== user.id);

          // Send file-ready-for-review notification to each reviewer
          for (const reviewer of reviewers) {
            await notificationService.triggerWorkflow({
              workflowId: "file-ready-for-review",
              recipientId: reviewer.userId,
              actorId: user.id,
              data: {
                workspaceId: section.workspaceId,
                workspaceName: workspace.name,
                taskId: task.id,
                taskTitle: task.title,
                fileName: name,
                uploadedBy: user.name || user.email,
              },
              tenant: section.workspaceId,
            });
          }
        } catch (err) {
          console.error("Failed to send file-ready-for-review notifications:", err);
        }
      })();
    }

    return json(file);
  });
}
