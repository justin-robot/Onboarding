import { fileService, taskService, sectionService } from "@repo/database";
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

    return json(file);
  });
}
