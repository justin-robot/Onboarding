import { templateService } from "@/lib/services";
import { json, requireAdminAuth, withErrorHandler, NotFoundError } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/templates/[id]/workspaces - Get template with derived workspaces
 */
export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAdminAuth();

    const { id: templateId } = await params;

    const result = await templateService.getTemplateWithDerivedWorkspaces(templateId);

    if (!result) {
      throw new NotFoundError("Template not found");
    }

    return json(result);
  });
}
