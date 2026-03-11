import { workspaceService } from "@/lib/services";
import { json, errorResponse, requireAdminAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Check if user can access a specific workspace
 */
async function checkWorkspaceAccess(workspaceIds: string[] | null, workspaceId: string): Promise<boolean> {
  // Platform admin can access all workspaces
  if (workspaceIds === null) return true;
  // Workspace admin can only access their workspaces
  return workspaceIds.includes(workspaceId);
}

/**
 * GET /api/admin/workspaces/[id] - Get workspace details
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id } = await params;

    if (!(await checkWorkspaceAccess(workspaceIds, id))) {
      return errorResponse("Workspace not found", 404);
    }

    const workspace = await workspaceService.getByIdWithNested(id);

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    return json({ data: workspace });
  });
}

/**
 * PUT /api/admin/workspaces/[id] - Update workspace
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id } = await params;

    if (!(await checkWorkspaceAccess(workspaceIds, id))) {
      return errorResponse("Workspace not found", 404);
    }

    const body = await request.json();

    const { name, description, dueDate } = body;

    const workspace = await workspaceService.update(id, {
      name,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    return json({ data: workspace });
  });
}

/**
 * DELETE /api/admin/workspaces/[id] - Soft delete workspace
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id } = await params;

    if (!(await checkWorkspaceAccess(workspaceIds, id))) {
      return errorResponse("Workspace not found", 404);
    }

    const success = await workspaceService.softDelete(id);

    if (!success) {
      return errorResponse("Workspace not found", 404);
    }

    return json({ success: true });
  });
}

/**
 * PATCH /api/admin/workspaces/[id] - Restore workspace
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id } = await params;

    if (!(await checkWorkspaceAccess(workspaceIds, id))) {
      return errorResponse("Workspace not found", 404);
    }

    const body = await request.json();

    if (body.action === "restore") {
      const workspace = await workspaceService.restore(id);

      if (!workspace) {
        return errorResponse("Workspace not found or not deleted", 404);
      }

      return json({ data: workspace });
    }

    return errorResponse("Invalid action", 400);
  });
}
