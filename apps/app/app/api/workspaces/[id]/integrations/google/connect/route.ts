import { googleCalendarService } from "@/lib/services";
import { errorResponse, requireAuth, withErrorHandler } from "../../../../../_lib/api-utils";
import { NextResponse, type NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/integrations/google/connect - Initiate Google Calendar OAuth
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    if (!googleCalendarService.isConfigured()) {
      return errorResponse("Google Calendar integration not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and GOOGLE_TOKEN_ENCRYPTION_KEY environment variables.", 503);
    }

    // Create state parameter and generate auth URL
    const state = googleCalendarService.createState(workspaceId, user.id);
    const authUrl = googleCalendarService.getAuthUrl(state);

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  });
}
