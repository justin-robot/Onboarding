import { googleCalendarService, signNowService } from "@/lib/services";
import { json, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/integrations - Get status of all integrations
 *
 * Returns:
 * {
 *   google_calendar: { connected: boolean, connectedAt?: string, connectedBy?: string };
 *   signnow: { configured: boolean };
 * }
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: workspaceId } = await params;

    // Check Google Calendar integration
    const googleIntegration = await googleCalendarService.getIntegration(workspaceId);

    // Check SignNow configuration (global, not per-workspace)
    const signNowConfigured = signNowService.isConfigured();

    return json({
      google_calendar: {
        connected: !!(googleIntegration && googleIntegration.accessToken),
        connectedAt: googleIntegration?.createdAt?.toISOString() || undefined,
        connectedBy: googleIntegration?.connectedBy || undefined,
        accountEmail: googleIntegration?.accountEmail || undefined,
      },
      signnow: {
        configured: signNowConfigured,
      },
    });
  });
}
