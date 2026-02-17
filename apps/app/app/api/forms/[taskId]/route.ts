import { formService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ taskId: string }> };

/**
 * GET /api/forms/[taskId] - Get form config by task ID
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { taskId } = await params;

    const form = await formService.getFormByTaskId(taskId);

    // Return empty structure if no form exists yet
    if (!form) {
      return json({
        id: null,
        taskId,
        pages: [],
      });
    }

    return json(form);
  });
}

/**
 * PUT /api/forms/[taskId] - Save full form config (full replace)
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { taskId } = await params;
    const body = await request.json();

    // Validate body has pages array
    if (!body.pages || !Array.isArray(body.pages)) {
      return errorResponse("Request body must include pages array", 400);
    }

    const form = await formService.saveFullFormConfig(taskId, body.pages);

    return json(form);
  });
}
