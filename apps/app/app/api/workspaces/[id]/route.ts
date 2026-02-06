import { workspaceService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id] - Get workspace by ID with nested sections/tasks
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const workspace = await workspaceService.getByIdWithNested(id);
    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    return json(workspace);
  });
}

/**
 * PUT /api/workspaces/[id] - Update workspace
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const workspace = await workspaceService.update(id, {
      name: body.name,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    return json(workspace);
  });
}

/**
 * DELETE /api/workspaces/[id] - Soft delete workspace
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const deleted = await workspaceService.softDelete(id);
    if (!deleted) {
      return errorResponse("Workspace not found", 404);
    }

    return json({ success: true });
  });
}
