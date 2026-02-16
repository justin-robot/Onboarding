import { googleCalendarService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/workspaces/[id]/integrations/google - Disconnect Google Calendar
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: workspaceId } = await params;

    // Check if Google Calendar is connected
    const isConnected = await googleCalendarService.isConnected(workspaceId);
    if (!isConnected) {
      return errorResponse("Google Calendar not connected", 400);
    }

    // Disconnect the integration
    const success = await googleCalendarService.disconnect(workspaceId);
    if (!success) {
      return errorResponse("Failed to disconnect Google Calendar", 500);
    }

    return json({ success: true });
  });
}
