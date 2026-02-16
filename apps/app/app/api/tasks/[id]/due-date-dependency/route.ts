import { dependencyService, taskService, memberService, sectionService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/due-date-dependency - Get the date anchor dependency for a task
 *
 * Returns:
 * - dependency: The date anchor dependency if one exists
 * - anchorTask: Info about the anchor task
 * - availableAnchors: List of tasks that can be used as anchors
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;

    // Verify task exists
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get section to verify membership
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(section.workspaceId, user.id);
    if (!isMember) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    // Get current date anchor dependency
    const dateAnchor = await dependencyService.getDateAnchorDependency(taskId);

    // Get available anchor tasks
    const availableAnchors = await dependencyService.getAvailableAnchorTasks(taskId);

    return json({
      dependency: dateAnchor?.dependency || null,
      anchorTask: dateAnchor?.anchorTask || null,
      availableAnchors,
    });
  });
}

/**
 * POST /api/tasks/[id]/due-date-dependency - Set a date anchor dependency
 *
 * Body: { anchorTaskId: string, offsetDays: number }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;
    const body = await request.json();

    // Validate input
    if (!body.anchorTaskId || typeof body.anchorTaskId !== "string") {
      return errorResponse("anchorTaskId is required", 400);
    }

    const offsetDays = typeof body.offsetDays === "number" ? body.offsetDays : 0;

    // Verify task exists
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get section to verify membership and admin role
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Verify user is an admin of the workspace
    const membership = await memberService.getMember(section.workspaceId, user.id);
    if (!membership || membership.role !== "admin") {
      return errorResponse("Only admins can modify due date dependencies", 403);
    }

    // Verify anchor task exists and is in the same workspace
    const anchorTask = await taskService.getById(body.anchorTaskId);
    if (!anchorTask) {
      return errorResponse("Anchor task not found", 404);
    }

    const anchorSection = await sectionService.getById(anchorTask.sectionId);
    if (!anchorSection || anchorSection.workspaceId !== section.workspaceId) {
      return errorResponse("Anchor task must be in the same workspace", 400);
    }

    try {
      // Set the date anchor dependency
      const dependency = await dependencyService.setDateAnchorDependency(
        taskId,
        body.anchorTaskId,
        offsetDays
      );

      return json({
        dependency,
        anchorTask: {
          id: anchorTask.id,
          title: anchorTask.title,
          status: anchorTask.status,
        },
      }, 201);
    } catch (error) {
      if (error instanceof Error && error.name === "CircularDependencyError") {
        return errorResponse("This would create a circular dependency", 400);
      }
      throw error;
    }
  });
}

/**
 * DELETE /api/tasks/[id]/due-date-dependency - Remove the date anchor dependency
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;

    // Verify task exists
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get section to verify membership and admin role
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Verify user is an admin of the workspace
    const membership = await memberService.getMember(section.workspaceId, user.id);
    if (!membership || membership.role !== "admin") {
      return errorResponse("Only admins can modify due date dependencies", 403);
    }

    // Remove the date anchor dependency
    const removed = await dependencyService.removeDateAnchorDependency(taskId);

    return json({ success: removed });
  });
}
