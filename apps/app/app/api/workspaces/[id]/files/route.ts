import { fileService, workspaceService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/workspaces/[id]/files - Get files for a workspace
 * Query params:
 *   - folderId: Filter to files in this folder (if not provided, returns root-level files)
 *   - all: If "true", returns all files regardless of folder
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const includeAll = searchParams.get("all") === "true";

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

    // If folderId provided, verify it exists and is a folder
    if (folderId) {
      const folder = await fileService.getFolderById(folderId);
      if (!folder) {
        return errorResponse("Folder not found", 404);
      }
      if (folder.workspaceId !== workspaceId) {
        return errorResponse("Folder does not belong to this workspace", 403);
      }
    }

    // Get files for the workspace, filtered by folder
    const files = await fileService.getByWorkspaceId(workspaceId, folderId, includeAll);

    // Add item counts for folders
    const filesWithCounts = await Promise.all(
      files.map(async (file) => {
        if (file.mimeType === "application/x-folder") {
          const itemCount = await fileService.countItemsInFolder(file.id);
          return { ...file, itemCount };
        }
        return file;
      })
    );

    return json({ files: filesWithCounts });
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
 * Body: { name: string, folderId?: string }
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

    // If creating inside a folder, verify the parent folder exists
    const parentFolderId = body.folderId || null;
    if (parentFolderId) {
      const parentFolder = await fileService.getFolderById(parentFolderId);
      if (!parentFolder) {
        return errorResponse("Parent folder not found", 404);
      }
      if (parentFolder.workspaceId !== workspaceId) {
        return errorResponse("Parent folder does not belong to this workspace", 403);
      }
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
      folderId: parentFolderId,
      generateThumbnail: false,
    });

    return json(folder, 201);
  });
}
