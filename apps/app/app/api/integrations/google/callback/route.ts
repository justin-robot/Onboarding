import { NextRequest, NextResponse } from "next/server";
import { googleCalendarService } from "@/lib/services";

/**
 * GET /api/integrations/google/callback - Handle Google OAuth callback
 *
 * This is the redirect URI that Google calls after the user authorizes.
 * The GOOGLE_REDIRECT_URI env var should be set to this endpoint.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth error (user denied access)
    if (error) {
      console.error("Google OAuth error:", error);
      // Parse state to get workspaceId for redirect
      const stateData = state ? googleCalendarService.parseState(state) : null;
      const workspaceId = stateData?.workspaceId;

      if (workspaceId) {
        return NextResponse.redirect(
          new URL(`/workspace/${workspaceId}?error=oauth_denied`, request.url)
        );
      }
      return NextResponse.redirect(new URL("/?error=oauth_denied", request.url));
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/workspaces?error=missing_params", request.url)
      );
    }

    // Parse state to get workspaceId and userId
    const stateData = googleCalendarService.parseState(state);
    if (!stateData) {
      return NextResponse.redirect(
        new URL("/workspaces?error=invalid_state", request.url)
      );
    }

    const { workspaceId, userId } = stateData;

    try {
      // Exchange code for tokens and store them
      await googleCalendarService.handleCallback(code, workspaceId, userId);

      // Redirect back to workspace with success message
      return NextResponse.redirect(
        new URL(`/workspace/${workspaceId}?success=google_connected`, request.url)
      );
    } catch (callbackError) {
      console.error("Error exchanging Google OAuth tokens:", callbackError);
      // Still redirect to workspace but with error
      return NextResponse.redirect(
        new URL(`/workspace/${workspaceId}?error=google_connect_failed`, request.url)
      );
    }
  } catch (error) {
    console.error("Error handling Google OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/workspaces?error=callback_failed", request.url)
    );
  }
}
