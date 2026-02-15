import { fileService, workspaceService, memberService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/workspaces/[id]/files - Get all files for a workspace
 */
export async function GET(
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

    // Get all files for the workspace
    const files = await fileService.getByWorkspaceId(workspaceId);

    return json({ files });
  });
}

/**
 * DELETE /api/workspaces/[id]/files - Delete a file from workspace
 * Query param: fileId
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return errorResponse("File ID is required", 400);
    }

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

    // Get file to verify it belongs to this workspace
    const file = await fileService.getById(fileId);
    if (!file) {
      return errorResponse("File not found", 404);
    }

    if (file.workspaceId !== workspaceId) {
      return errorResponse("File does not belong to this workspace", 403);
    }

    // Delete the file
    const deleted = await fileService.delete(fileId);
    if (!deleted) {
      return errorResponse("Failed to delete file", 500);
    }

    return json({ success: true });
  });
}

/**
 * POST /api/workspaces/[id]/files - Create a folder in workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return errorResponse("Folder name is required", 400);
    }

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

    // Create folder entry (folders are just files with a special mimeType)
    const folder = await fileService.confirmUpload({
      workspaceId,
      uploadedBy: user.id,
      name: body.name.trim(),
      mimeType: "application/x-folder",
      size: 0,
      key: `folders/${workspaceId}/${Date.now()}-${body.name.trim()}`,
      sourceType: "upload",
      generateThumbnail: false,
    });

    return json(folder, 201);
  });
}
