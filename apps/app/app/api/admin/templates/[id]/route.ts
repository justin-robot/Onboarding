import { templateService } from "@/lib/services";
import { json, errorResponse, requireAdminAuth, withErrorHandler, NotFoundError } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/templates/[id] - Get a single template
 */
export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAdminAuth();

    const { id: templateId } = await params;

    const template = await templateService.getTemplate(templateId);

    if (!template) {
      throw new NotFoundError("Template not found");
    }

    return json(template);
  });
}

/**
 * DELETE /api/admin/templates/[id] - Delete a template
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { user } = await requireAdminAuth();

    const { id: templateId } = await params;

    const result = await templateService.deleteTemplate(templateId, {
      actorId: user.id,
      source: "admin",
    });

    if (!result.success) {
      return errorResponse(result.error || "Failed to delete template", 400);
    }

    return json({
      success: true,
      message: "Template deleted successfully",
    });
  });
}
