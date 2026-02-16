import { NextRequest, NextResponse } from "next/server";
import { googleCalendarService } from "@repo/database";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const userId = searchParams.get("userId");

    if (!workspaceId || !userId) {
      return NextResponse.json(
        { error: "Missing workspaceId or userId" },
        { status: 400 }
      );
    }

    if (!googleCalendarService.isConfigured()) {
      return NextResponse.json(
        { error: "Google Calendar integration not configured" },
        { status: 503 }
      );
    }

    // Create state parameter and generate auth URL
    const state = googleCalendarService.createState(workspaceId, userId);
    const authUrl = googleCalendarService.getAuthUrl(state);

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
};
