import { templateService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const duplicateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assignToUsers: z.array(z.string()).optional(),
});

/**
 * POST /api/admin/workspaces/[id]/duplicate - Duplicate a workspace
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    if (user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const { id: sourceWorkspaceId } = await params;
    const body = await request.json();
    const parsed = duplicateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid request body", 400);
    }

    const { name, description, dueDate, assignToUsers } = parsed.data;

    const result = await templateService.duplicateWorkspace(
      sourceWorkspaceId,
      {
        name,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
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
