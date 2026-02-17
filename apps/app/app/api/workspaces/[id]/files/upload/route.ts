import { fileService, workspaceService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * POST /api/workspaces/[id]/files/upload - Get a presigned URL for uploading a file
 *
 * Body: { filename: string, mimeType: string }
 * Returns: { uploadUrl: string, key: string, expiresIn: number }
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
    const { filename, mimeType } = body;

    // Validate required fields
    if (!filename || typeof filename !== "string") {
      return errorResponse("filename is required", 400);
    }
    if (!mimeType || typeof mimeType !== "string") {
      return errorResponse("mimeType is required", 400);
    }

    // Get presigned upload URL
    const result = await fileService.getPresignedUploadUrl(
      workspaceId,
      filename,
      mimeType
    );

    return json(result);
  });
}
