import { memberService, taskService, sectionService, pendingAssigneeService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string; email: string }> };

/**
 * DELETE /api/tasks/[id]/assignees/pending/[email] - Remove a pending assignment
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId, email } = await params;

    // Decode the email (may be URL encoded)
    const decodedEmail = decodeURIComponent(email);

    // Get task to find workspace
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get section to find workspace
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Check if current user is manager
    const currentMember = await memberService.getMember(section.workspaceId, user.id);
    if (!currentMember || currentMember.role !== "manager") {
      return errorResponse("Only managers can remove pending assignments", 403);
    }

    // Delete the pending assignment
    const deleted = await pendingAssigneeService.deleteByTaskAndEmail(taskId, decodedEmail);

    if (!deleted) {
      return errorResponse("Pending assignment not found", 404);
    }

    return json({ success: true });
  });
}
