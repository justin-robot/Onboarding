import { taskService } from "@/lib/services";
import { database } from "@repo/database";
import { json, errorResponse, requireAdminAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
  dueDateType: z.enum(["none", "fixed", "relative"]).optional(),
  dueDateValue: z.string().nullable().optional(),
  completionRule: z.enum(["any", "all"]).optional(),
});

/**
 * Check if user can access a task via its workspace
 */
async function checkTaskAccess(workspaceIds: string[] | null, taskId: string): Promise<boolean> {
  // Platform admin can access all tasks
  if (workspaceIds === null) return true;

  // Get the workspace ID for this task
  const task = await database
    .selectFrom("task")
    .innerJoin("section", "section.id", "task.sectionId")
    .select("section.workspaceId")
    .where("task.id", "=", taskId)
    .executeTakeFirst();

  if (!task) return false;

  return workspaceIds.includes(task.workspaceId);
}

/**
 * GET /api/admin/tasks/[id] - Get task details with full config
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id } = await params;

    if (!(await checkTaskAccess(workspaceIds, id))) {
      return errorResponse("Task not found", 404);
    }

    const task = await taskService.getByIdFull(id);

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return json({ data: task });
  });
}

/**
 * PUT /api/admin/tasks/[id] - Update a task
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { user, workspaceIds } = await requireAdminAuth();

    const { id } = await params;

    if (!(await checkTaskAccess(workspaceIds, id))) {
      return errorResponse("Task not found", 404);
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid request body", 400);
    }

    const { title, description, status, dueDateType, dueDateValue, completionRule } = parsed.data;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (dueDateType !== undefined) updateData.dueDateType = dueDateType;
    if (dueDateValue !== undefined) {
      updateData.dueDateValue = dueDateValue ? new Date(dueDateValue) : null;
    }
    if (completionRule !== undefined) updateData.completionRule = completionRule;

    const task = await taskService.update(id, updateData, {
      actorId: user.id,
      source: "admin",
    });

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return json({ data: task });
  });
}
