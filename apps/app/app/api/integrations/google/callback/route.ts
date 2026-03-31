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
      // Log detailed error for debugging
      const errorMessage = callbackError instanceof Error ? callbackError.message : "Unknown error";
      console.error("Error exchanging Google OAuth tokens:", {
        error: errorMessage,
        workspaceId,
        userId,
        // Don't log the code as it's sensitive
      });

      // Include error type in redirect for better debugging
      const errorType = errorMessage.includes("ENCRYPTION_KEY")
        ? "config_error"
        : errorMessage.includes("redirect_uri")
          ? "redirect_mismatch"
          : "google_connect_failed";

      return NextResponse.redirect(
        new URL(`/workspace/${workspaceId}?error=${errorType}`, request.url)
      );
    }
  } catch (error) {
    console.error("Error handling Google OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/workspaces?error=callback_failed", request.url)
    );
  }
}
