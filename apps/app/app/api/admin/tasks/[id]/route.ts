import { taskService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/tasks/[id] - Get task details with full config
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    if (user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;
    const task = await taskService.getByIdFull(id);

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return json({ data: task });
  });
}
