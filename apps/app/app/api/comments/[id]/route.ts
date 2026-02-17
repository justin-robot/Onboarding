import { commentService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/comments/[id] - Get a comment by ID
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const comment = await commentService.getById(id);
    if (!comment) {
      return errorResponse("Comment not found", 404);
    }

    // Get workspace ID to verify membership
    const workspaceId = await commentService.getTaskWorkspaceId(comment.taskId);
    if (!workspaceId) {
      return errorResponse("Workspace not found", 404);
    }

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    return json(comment);
  });
}

/**
 * DELETE /api/comments/[id] - Delete a comment (soft delete)
 * Only the comment author can delete their own comment
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Get comment first to verify it exists and get workspaceId
    const comment = await commentService.getById(id);
    if (!comment) {
      return errorResponse("Comment not found", 404);
    }

    // Verify user owns the comment
    if (comment.userId !== user.id) {
      return errorResponse("You can only delete your own comments", 403);
    }

    // Get workspace ID for verification
    const workspaceId = await commentService.getTaskWorkspaceId(comment.taskId);
    if (!workspaceId) {
      return errorResponse("Workspace not found", 404);
    }

    // Verify user is still a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    // Delete the comment
    const deleted = await commentService.delete(id, user.id);
    if (!deleted) {
      return errorResponse("Failed to delete comment", 500);
    }

    return json({ success: true });
  });
}
