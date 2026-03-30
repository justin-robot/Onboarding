import { dependencyService, taskService, memberService, sectionService, CircularDependencyError } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/dependencies - Get all dependencies for a task
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    // Get dependencies with details
    const dependencies = await dependencyService.getDependenciesWithDetails(id);

    // Get available tasks that can be added as dependencies
    const availableTasks = await dependencyService.getAvailableAnchorTasks(id);

    return json({
      dependencies,
      availableTasks,
    });
  });
}

/**
 * POST /api/tasks/[id]/dependencies - Add a new dependency
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;
    const body = await request.json();

    const { dependsOnTaskId, type = "unlock", offsetDays } = body;

    if (!dependsOnTaskId) {
      return errorResponse("dependsOnTaskId is required", 400);
    }

    // Validate type
    if (!["unlock", "date_anchor", "both"].includes(type)) {
      return errorResponse("type must be 'unlock', 'date_anchor', or 'both'", 400);
    }

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

    // Check manager permission
    const membership = await memberService.getMember(section.workspaceId, user.id);
    if (!membership || membership.role !== "manager") {
      return errorResponse("Only managers can modify dependencies", 403);
    }

    // Check that dependsOnTaskId exists in the same workspace
    const dependsOnTask = await taskService.getById(dependsOnTaskId);
    if (!dependsOnTask) {
      return errorResponse("Prerequisite task not found", 404);
    }

    const dependsOnSection = await sectionService.getById(dependsOnTask.sectionId);
    if (!dependsOnSection || dependsOnSection.workspaceId !== section.workspaceId) {
      return errorResponse("Prerequisite task must be in the same workspace", 400);
    }

    try {
      const dependency = await dependencyService.create({
        taskId,
        dependsOnTaskId,
        type,
        offsetDays: offsetDays ?? null,
      });

      return json({ dependency }, 201);
    } catch (error) {
      if (error instanceof CircularDependencyError) {
        return errorResponse("Cannot create dependency: would create a circular dependency", 400);
      }
      throw error;
    }
  });
}

/**
 * DELETE /api/tasks/[id]/dependencies - Remove a dependency
 * Query param: dependencyId or dependsOnTaskId
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;
    const url = new URL(request.url);
    const dependencyId = url.searchParams.get("dependencyId");
    const dependsOnTaskId = url.searchParams.get("dependsOnTaskId");

    if (!dependencyId && !dependsOnTaskId) {
      return errorResponse("Either dependencyId or dependsOnTaskId is required", 400);
    }

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

    // Check manager permission
    const membership = await memberService.getMember(section.workspaceId, user.id);
    if (!membership || membership.role !== "manager") {
      return errorResponse("Only managers can modify dependencies", 403);
    }

    let removed = false;
    if (dependencyId) {
      removed = await dependencyService.remove(dependencyId);
    } else if (dependsOnTaskId) {
      removed = await dependencyService.removeByTasks(taskId, dependsOnTaskId);
    }

    if (!removed) {
      return errorResponse("Dependency not found", 404);
    }

    return json({ success: true });
  });
}
