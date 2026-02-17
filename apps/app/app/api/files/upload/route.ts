import { fileService, taskService, sectionService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * POST /api/files/upload - Get a presigned URL for uploading a file
 *
 * Body: { taskId: string, filename: string, mimeType: string }
 * Returns: { uploadUrl: string, key: string, expiresIn: number }
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAuth();

    const body = await request.json();
    const { taskId, filename, mimeType } = body;

    // Validate required fields
    if (!taskId || typeof taskId !== "string") {
      return errorResponse("taskId is required", 400);
    }
    if (!filename || typeof filename !== "string") {
      return errorResponse("filename is required", 400);
    }
    if (!mimeType || typeof mimeType !== "string") {
      return errorResponse("mimeType is required", 400);
    }

    // Get task to find section
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get section to find workspace
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Get presigned upload URL
    const result = await fileService.getPresignedUploadUrl(
      section.workspaceId,
      filename,
      mimeType
    );

    return json(result);
  });
}
