import { taskService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";
import type { TaskStatus, CompletionRule } from "@repo/database";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id] - Get task by ID
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const task = await taskService.getById(id);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return json(task);
  });
}

/**
 * PUT /api/tasks/[id] - Update task
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const task = await taskService.update(id, {
      title: body.title,
      description: body.description,
      status: body.status as TaskStatus | undefined,
      completionRule: body.completionRule as CompletionRule | undefined,
      dueDateType: body.dueDateType,
      dueDateValue: body.dueDateValue ? new Date(body.dueDateValue) : undefined,
    });

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return json(task);
  });
}

/**
 * DELETE /api/tasks/[id] - Soft delete task
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const deleted = await taskService.softDelete(id);
    if (!deleted) {
      return errorResponse("Task not found", 404);
    }

    return json({ success: true });
  });
}
