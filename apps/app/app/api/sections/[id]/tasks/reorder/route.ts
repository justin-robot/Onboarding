import { taskService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/sections/[id]/tasks/reorder - Reorder tasks within section
 * Body: { taskIds: string[] }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: sectionId } = await params;
    const body = await request.json();

    if (!Array.isArray(body.taskIds)) {
      return errorResponse("taskIds array is required");
    }

    await taskService.reorder(sectionId, body.taskIds);

    return json({ success: true });
  });
}
