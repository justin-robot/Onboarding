import { taskService, configService, sectionService, assigneeService } from "@/lib/services";
import { ablyService, WORKSPACE_EVENTS } from "@/lib/services/ably";
import { notificationService } from "@repo/notifications";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import type { TaskType, DueDateType } from "@repo/database";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/sections/[id]/tasks - List tasks for section with lock status
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: sectionId } = await params;

    const tasks = await taskService.getBySectionIdWithLockStatus(sectionId);
    return json(tasks);
  });
}

/**
 * POST /api/sections/[id]/tasks - Create a new task in section
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: sectionId } = await params;
    const body = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return errorResponse("Title is required");
    }

    if (typeof body.position !== "number") {
      return errorResponse("Position is required");
    }

    const validTypes = ["FORM", "ACKNOWLEDGEMENT", "TIME_BOOKING", "E_SIGN", "FILE_REQUEST", "APPROVAL"];
    if (!body.type || !validTypes.includes(body.type)) {
      return errorResponse(`Type must be one of: ${validTypes.join(", ")}`);
    }

    const task = await taskService.create({
      sectionId,
      title: body.title,
      description: body.description,
      position: body.position,
      type: body.type as TaskType,
      dueDateType: body.dueDateType as DueDateType | undefined,
      dueDateValue: body.dueDateValue ? new Date(body.dueDateValue) : undefined,
    });

    // Auto-create config for task types that support it
    await configService.createConfigForTask(task.id, task.type);

    // Assign users if provided
    const assigneeIds = body.assigneeIds;
    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      for (const userId of assigneeIds) {
        if (typeof userId === "string") {
          await assigneeService.assign(task.id, userId, notificationService, {
            actorId: user.id,
            source: "web",
          });
        }
      }
    }

    // Broadcast task creation via Ably (non-blocking)
    (async () => {
      try {
        const section = await sectionService.getById(sectionId);
        if (section) {
          await ablyService.broadcastToWorkspace(
            section.workspaceId,
            WORKSPACE_EVENTS.TASK_CREATED,
            {
              id: task.id,
              title: task.title,
              type: task.type,
              status: task.status,
              sectionId: task.sectionId,
              position: task.position,
            }
          );
        }
      } catch (err) {
        console.error("Failed to broadcast task creation:", err);
      }
    })();

    return json(task, 201);
  });
}
