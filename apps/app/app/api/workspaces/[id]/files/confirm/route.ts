import { fileService, workspaceService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * POST /api/workspaces/[id]/files/confirm - Confirm a file upload after uploading to S3
 *
 * Body: { key: string, name: string, mimeType: string, size: number }
 * Returns: File record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    // Verify workspace exists
    const workspace = await workspaceService.getById(workspaceId);
    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    const body = await request.json();
    const { key, name, mimeType, size, folderId } = body;

    // Validate required fields
    if (!key || typeof key !== "string") {
      return errorResponse("key is required", 400);
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

    // If uploading to a folder, verify it exists
    if (folderId) {
      const folder = await fileService.getFolderById(folderId);
      if (!folder) {
        return errorResponse("Folder not found", 404);
      }
      if (folder.workspaceId !== workspaceId) {
        return errorResponse("Folder does not belong to this workspace", 403);
      }
    }

    // Confirm the upload and create file record
    const file = await fileService.confirmUpload({
      key,
      workspaceId,
      uploadedBy: user.id,
      name,
      mimeType,
      size,
      sourceType: "upload",
      folderId: folderId || null,
      generateThumbnail: true,
    });

    return json(file);
  });
}
