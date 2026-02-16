import { googleCalendarService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/meetings - List upcoming meetings from Google Calendar
 */
export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: workspaceId } = await params;

    // Check if Google Calendar is connected
    const isConnected = await googleCalendarService.isConnected(workspaceId);
    if (!isConnected) {
      return errorResponse("Google Calendar not connected", 400);
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
    const pageToken = searchParams.get("pageToken") || undefined;
    const timeMinStr = searchParams.get("timeMin");
    const timeMaxStr = searchParams.get("timeMax");

    const result = await googleCalendarService.getMeetings(workspaceId, {
      maxResults,
      pageToken,
      timeMin: timeMinStr ? new Date(timeMinStr) : undefined,
      timeMax: timeMaxStr ? new Date(timeMaxStr) : undefined,
    });

    return json(result);
  });
}

/**
 * POST /api/workspaces/[id]/meetings - Create a new meeting with Google Meet link
 *
 * Request body:
 * {
 *   title: string;
 *   description?: string;
 *   startTime: string; // ISO date string
 *   endTime: string; // ISO date string
 *   attendees?: string[]; // Email addresses
 *   timeZone?: string;
 * }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: workspaceId } = await params;

    // Check if Google Calendar is connected
    const isConnected = await googleCalendarService.isConnected(workspaceId);
    if (!isConnected) {
      return errorResponse("Google Calendar not connected", 400);
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return errorResponse("title is required", 400);
    }
    if (!body.startTime) {
      return errorResponse("startTime is required", 400);
    }
    if (!body.endTime) {
      return errorResponse("endTime is required", 400);
    }

    const result = await googleCalendarService.createEvent(workspaceId, {
      title: body.title,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      attendees: body.attendees,
      timeZone: body.timeZone,
    });

    return json(result, 201);
  });
}
