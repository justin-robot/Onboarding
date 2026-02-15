import { ablyService } from "@repo/database/services/ably";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * POST /api/realtime/token - Get Ably token for client
 * Body: { workspaceId: string } or { workspaceIds: string[] }
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();

    // Support single workspace or multiple workspaces
    const workspaceIds = body.workspaceIds || (body.workspaceId ? [body.workspaceId] : []);

    if (workspaceIds.length === 0) {
      return errorResponse("workspaceId or workspaceIds is required", 400);
    }

    try {
      const tokenRequest = await ablyService.createTokenRequestForWorkspaces(
        user.id,
        workspaceIds
      );

      if (!tokenRequest) {
        return errorResponse("Realtime service unavailable", 503);
      }

      return json(tokenRequest);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not a member")) {
        return errorResponse("Not authorized for these workspaces", 403);
      }
      throw err;
    }
  });
}
