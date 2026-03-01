import { assigneeService, memberService, taskService, sectionService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string; userId: string }> };

/**
 * DELETE /api/tasks/[id]/assignees/[userId] - Remove a user from a task
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId, userId } = await params;

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

    // Check if current user is admin
    const currentMember = await memberService.getMember(section.workspaceId, user.id);
    if (!currentMember || currentMember.role !== "admin") {
      return errorResponse("Only admins can unassign users from tasks", 403);
    }

    // Check if user is assigned
    const isAssigned = await assigneeService.isAssigned(taskId, userId);
    if (!isAssigned) {
      return errorResponse("User is not assigned to this task", 400);
    }

    // Unassign the user with audit context
    await assigneeService.unassign(taskId, userId, {
      actorId: user.id,
      source: "web",
    });

    return json({ success: true });
  });
}
