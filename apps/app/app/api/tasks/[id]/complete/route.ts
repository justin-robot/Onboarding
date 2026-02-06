import { taskService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/complete - Mark task as completed
 */
export async function POST(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const task = await taskService.markComplete(id);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return json(task);
  });
}
