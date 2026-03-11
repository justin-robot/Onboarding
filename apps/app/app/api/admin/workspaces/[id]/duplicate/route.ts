import { templateService } from "@/lib/services";
import { json, errorResponse, requireAdminAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const duplicateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  adminUserId: z.string().min(1, "Admin user is required"),
  assignToUsers: z.array(z.string()).optional(),
});

/**
 * POST /api/admin/workspaces/[id]/duplicate - Duplicate a workspace
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { user, workspaceIds } = await requireAdminAuth();

    const { id: sourceWorkspaceId } = await params;

    // Check workspace access
    if (workspaceIds !== null && !workspaceIds.includes(sourceWorkspaceId)) {
      return errorResponse("Workspace not found", 404);
    }

    const body = await request.json();
    const parsed = duplicateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid request body", 400);
    }

    const { name, description, dueDate, adminUserId, assignToUsers } = parsed.data;

    const result = await templateService.duplicateWorkspace(
      sourceWorkspaceId,
      {
        name,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        adminUserId,
        assignToUsers,
      },
      {
        actorId: user.id,
        source: "admin",
      }
    );

    if (!result.success) {
      return errorResponse(result.error || "Failed to duplicate workspace", 400);
    }

    return json({
      success: true,
      workspaceId: result.workspaceId,
      message: "Workspace duplicated successfully",
    });
  });
}
