import { sectionService } from "@repo/database";
import { ablyService, WORKSPACE_EVENTS } from "@repo/database/services/ably";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/sections - List sections for workspace
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: workspaceId } = await params;

    const sections = await sectionService.getByWorkspaceId(workspaceId);
    return json(sections);
  });
}

/**
 * POST /api/workspaces/[id]/sections - Create a new section in workspace
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: workspaceId } = await params;
    const body = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return errorResponse("Title is required");
    }

    if (typeof body.position !== "number") {
      return errorResponse("Position is required");
    }

    const section = await sectionService.create({
      workspaceId,
      title: body.title,
      position: body.position,
    });

    // Broadcast section creation via Ably (non-blocking)
    ablyService.broadcastToWorkspace(
      workspaceId,
      WORKSPACE_EVENTS.SECTION_CREATED,
      {
        id: section.id,
        title: section.title,
        position: section.position,
        workspaceId: section.workspaceId,
      }
    ).catch((err) => {
      console.error("Failed to broadcast section creation:", err);
    });

    return json(section, 201);
  });
}
