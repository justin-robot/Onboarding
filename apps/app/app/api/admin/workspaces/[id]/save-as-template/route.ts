import { templateService } from "@/lib/services";
import { json, errorResponse, requireAdminAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/workspaces/[id]/save-as-template - Create a template copy of workspace
 * The original workspace remains unchanged and is linked to the new template
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { user, workspaceIds } = await requireAdminAuth();

    const { id: workspaceId } = await params;

    // Check workspace access
    if (workspaceIds !== null && !workspaceIds.includes(workspaceId)) {
      return errorResponse("Workspace not found", 404);
    }

    const result = await templateService.saveAsTemplate(workspaceId, {
      actorId: user.id,
      source: "admin",
    });

    if (!result.success) {
      return errorResponse(result.error || "Failed to save workspace as template", 400);
    }

    return json({
      success: true,
      templateId: result.templateId,
      message: "Template created successfully. Original workspace remains unchanged.",
    });
  });
}
