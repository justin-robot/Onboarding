import { sectionService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/workspaces/[id]/sections/reorder - Reorder sections
 * Body: { sectionIds: string[] }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: workspaceId } = await params;
    const body = await request.json();

    if (!Array.isArray(body.sectionIds)) {
      return errorResponse("sectionIds array is required");
    }

    await sectionService.reorder(workspaceId, body.sectionIds);

    return json({ success: true });
  });
}
