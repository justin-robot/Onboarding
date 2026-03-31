import { templateService } from "@/lib/services";
import { json, errorResponse, requireAdminAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

/**
 * GET /api/admin/templates - List all templates
 */
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await templateService.listTemplates({
      search,
      limit,
      offset,
    });

    return json(result);
  });
}

const createFromTemplateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  inviteEmail: z.string().email().nullable().optional(),
});

/**
 * POST /api/admin/templates - Create a workspace from a template
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const { user } = await requireAdminAuth();

    const body = await request.json();
    const parsed = createFromTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid request body", 400);
    }

    const { templateId, name, description, dueDate, inviteEmail } = parsed.data;

    const result = await templateService.createFromTemplate(
      templateId,
      {
        name,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        adminUserId: user.id,
        inviteEmail: inviteEmail || undefined,
      },
      {
        actorId: user.id,
        source: "admin",
      }
    );

    if (!result.success) {
      return errorResponse(result.error || "Failed to create workspace from template", 400);
    }

    return json({
      success: true,
      workspaceId: result.workspaceId,
      message: "Workspace created from template successfully",
    });
  });
}
