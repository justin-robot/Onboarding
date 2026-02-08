import { sectionService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/sections/[id] - Get section by ID with nested tasks (including lock status)
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const section = await sectionService.getByIdWithTasksAndLockStatus(id);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    return json(section);
  });
}

/**
 * PUT /api/sections/[id] - Update section
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const section = await sectionService.update(id, {
      title: body.title,
      position: body.position,
    });

    if (!section) {
      return errorResponse("Section not found", 404);
    }

    return json(section);
  });
}

/**
 * DELETE /api/sections/[id] - Soft delete section
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const deleted = await sectionService.softDelete(id);
    if (!deleted) {
      return errorResponse("Section not found", 404);
    }

    return json({ success: true });
  });
}
