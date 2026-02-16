import { NextRequest, NextResponse } from "next/server";
import { googleCalendarService } from "@repo/database";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth error
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings/integrations?error=oauth_denied", request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=missing_params", request.url)
      );
    }

    // Parse state to get workspaceId and userId
    const stateData = googleCalendarService.parseState(state);
    if (!stateData) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    const { workspaceId, userId } = stateData;

    // Exchange code for tokens and store them
    await googleCalendarService.handleCallback(code, workspaceId, userId);

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?success=google_connected&workspace=${workspaceId}`,
        request.url
      )
    );
  } catch (error) {
    console.error("Error handling Google OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=callback_failed", request.url)
    );
  }
};
