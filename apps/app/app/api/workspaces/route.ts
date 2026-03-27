import { workspaceService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/workspaces - List all workspaces
 */
export async function GET() {
  return withErrorHandler(async () => {
    await requireAuth();
    const workspaces = await workspaceService.list();
    return json(workspaces);
  });
}

/**
 * POST /api/workspaces - Create a new workspace
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return errorResponse("Name is required");
    }

    const workspace = await workspaceService.create({
      name: body.name,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });

    // Add creator as admin member
    await memberService.addMember({
      workspaceId: workspace.id,
      userId: user.id,
      role: "admin",
    });

    return json(workspace, 201);
  });
}
