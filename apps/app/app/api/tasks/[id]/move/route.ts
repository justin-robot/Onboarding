import { taskService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/move - Move task to different section
 * Body: { sectionId: string, position: number }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.sectionId || typeof body.sectionId !== "string") {
      return errorResponse("sectionId is required");
    }

    if (typeof body.position !== "number") {
      return errorResponse("position is required");
    }

    const task = await taskService.moveToSection(id, body.sectionId, body.position);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return json(task);
  });
}
