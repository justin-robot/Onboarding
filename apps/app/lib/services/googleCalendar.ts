import { google, Auth } from "googleapis";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { database } from "@repo/database";
import type { WorkspaceIntegration } from "@repo/database";

// Google OAuth configuration
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email", // To get the connected account email
];

// Encryption key for tokens (32 bytes for AES-256)
function getEncryptionKey(): Buffer {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY not configured");
  }
  // Key must be 64 hex characters (32 bytes for AES-256)
  if (key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters");
  }
  return Buffer.from(key, "hex");
}

// Encrypt token
function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Decrypt token
function decryptToken(encryptedToken: string): string {
  const [ivHex, encryptedHex] = encryptedToken.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// Create OAuth2 client
function createOAuth2Client(): Auth.OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Token response from Google
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
}

export const googleCalendarService = {
  /**
   * Check if Google Calendar is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    );
  },

  /**
   * Generate OAuth authorization URL
   * @param state - State parameter containing workspaceId and userId (base64 encoded JSON)
   */
  getAuthUrl(state: string): string {
    const oauth2Client = createOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state,
      prompt: "consent", // Force consent to always get refresh token
    });
  },

  /**
   * Create state parameter for OAuth flow
   */
  createState(workspaceId: string, userId: string): string {
    return Buffer.from(
      JSON.stringify({ workspaceId, userId })
    ).toString("base64");
  },

  /**
   * Parse state parameter from OAuth callback
   */
  parseState(state: string): { workspaceId: string; userId: string } | null {
    try {
      const json = Buffer.from(state, "base64").toString("utf8");
      const parsed = JSON.parse(json);
      if (parsed.workspaceId && parsed.userId) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Exchange authorization code for tokens and store them
   */
  async handleCallback(
    code: string,
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceIntegration> {
    const oauth2Client = createOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received from Google");
    }

    // Fetch the user's email from Google
    let accountEmail: string | null = null;
    try {
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      accountEmail = userInfo.data.email || null;
    } catch (error) {
      console.error("Failed to fetch Google account email:", error);
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : null;

    // Upsert integration record
    const existing = await database
      .selectFrom("workspace_integration")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("provider", "=", "google_calendar")
      .executeTakeFirst();

    if (existing) {
      // Update existing integration
      return await database
        .updateTable("workspace_integration")
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken || existing.refreshToken, // Keep old refresh token if new one not provided
          tokenExpiresAt,
          scope: tokens.scope || existing.scope,
          accountEmail: accountEmail || existing.accountEmail,
          connectedBy: userId,
          updatedAt: new Date(),
        })
        .where("id", "=", existing.id)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    // Create new integration
    return await database
      .insertInto("workspace_integration")
      .values({
        workspaceId,
        provider: "google_calendar",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        scope: tokens.scope || SCOPES.join(" "),
        accountEmail,
        connectedBy: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Get the integration for a workspace
   */
  async getIntegration(workspaceId: string): Promise<WorkspaceIntegration | null> {
    const integration = await database
      .selectFrom("workspace_integration")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("provider", "=", "google_calendar")
      .executeTakeFirst();

    return integration ?? null;
  },

  /**
   * Get an authenticated OAuth client for a workspace
   * Handles token refresh automatically
   */
  async getAuthenticatedClient(workspaceId: string) {
    const integration = await this.getIntegration(workspaceId);
    if (!integration || !integration.accessToken) {
      throw new Error("Google Calendar not connected for this workspace");
    }

    const oauth2Client = createOAuth2Client();

    // Decrypt tokens
    const accessToken = decryptToken(integration.accessToken);
    const refreshToken = integration.refreshToken
      ? decryptToken(integration.refreshToken)
      : null;

    // Check if token needs refresh
    const isExpired = integration.tokenExpiresAt
      ? new Date(integration.tokenExpiresAt).getTime() < Date.now() + 60000 // 1 min buffer
      : false;

    if (isExpired && refreshToken) {
      // Refresh the token
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update stored tokens
      const encryptedAccessToken = encryptToken(credentials.access_token!);
      const tokenExpiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : null;

      await database
        .updateTable("workspace_integration")
        .set({
          accessToken: encryptedAccessToken,
          tokenExpiresAt,
          updatedAt: new Date(),
        })
        .where("id", "=", integration.id)
        .execute();

      oauth2Client.setCredentials(credentials);
    } else {
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    return oauth2Client;
  },

  /**
   * Disconnect Google Calendar integration
   */
  async disconnect(workspaceId: string): Promise<boolean> {
    const result = await database
      .deleteFrom("workspace_integration")
      .where("workspaceId", "=", workspaceId)
      .where("provider", "=", "google_calendar")
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Check if a workspace has Google Calendar connected
   */
  async isConnected(workspaceId: string): Promise<boolean> {
    const integration = await this.getIntegration(workspaceId);
    return !!(integration && integration.accessToken);
  },

  /**
   * Create a calendar event with Google Meet link
   */
  async createEvent(
    workspaceId: string,
    options: {
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      attendees?: string[]; // Email addresses
      timeZone?: string;
    }
  ): Promise<{ eventId: string; meetLink: string | null; htmlLink: string }> {
    const oauth2Client = await this.getAuthenticatedClient(workspaceId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: options.title,
      description: options.description,
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: options.timeZone || "UTC",
      },
      end: {
        dateTime: options.endTime.toISOString(),
        timeZone: options.timeZone || "UTC",
      },
      attendees: options.attendees?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1, // Required for Meet link creation
      sendUpdates: options.attendees?.length ? "all" : "none",
    });

    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri ?? null;

    return {
      eventId: response.data.id!,
      meetLink,
      htmlLink: response.data.htmlLink!,
    };
  },

  /**
   * Create a calendar event and update the booking record
   */
  async createEventForBooking(
    workspaceId: string,
    bookingId: string,
    options: {
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      attendees?: string[];
      timeZone?: string;
    }
  ): Promise<{ eventId: string; meetLink: string | null }> {
    // Create the calendar event
    const { eventId, meetLink } = await this.createEvent(workspaceId, options);

    // Update the booking record
    await database
      .updateTable("booking")
      .set({
        calendarEventId: eventId,
        meetLink,
        status: "booked",
        bookedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", bookingId)
      .execute();

    return { eventId, meetLink };
  },

  /**
   * Delete a calendar event
   */
  async deleteEvent(workspaceId: string, eventId: string): Promise<boolean> {
    try {
      const oauth2Client = await this.getAuthenticatedClient(workspaceId);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      await calendar.events.delete({
        calendarId: "primary",
        eventId,
        sendUpdates: "all",
      });

      return true;
    } catch (error) {
      console.error("Failed to delete calendar event:", error);
      return false;
    }
  },

  /**
   * Get calendar event details
   */
  async getEvent(
    workspaceId: string,
    eventId: string
  ): Promise<{ id: string; summary: string; start: Date; end: Date; meetLink: string | null } | null> {
    try {
      const oauth2Client = await this.getAuthenticatedClient(workspaceId);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const response = await calendar.events.get({
        calendarId: "primary",
        eventId,
      });

      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri ?? null;

      return {
        id: response.data.id!,
        summary: response.data.summary || "",
        start: new Date(response.data.start?.dateTime || response.data.start?.date || ""),
        end: new Date(response.data.end?.dateTime || response.data.end?.date || ""),
        meetLink,
      };
    } catch (error) {
      console.error("Failed to get calendar event:", error);
      return null;
    }
  },

  /**
   * Get upcoming meetings for a workspace
   * Queries events from the connected Google Calendar
   */
  async getMeetings(
    workspaceId: string,
    options: {
      maxResults?: number;
      pageToken?: string;
      timeMin?: Date;
      timeMax?: Date;
    } = {}
  ): Promise<{
    meetings: Array<{
      id: string;
      summary: string;
      description: string | null;
      start: Date;
      end: Date;
      meetLink: string | null;
      attendees: string[];
      htmlLink: string;
    }>;
    nextPageToken: string | null;
  }> {
    const oauth2Client = await this.getAuthenticatedClient(workspaceId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: (options.timeMin || new Date()).toISOString(),
      timeMax: options.timeMax?.toISOString(),
      maxResults: options.maxResults || 20,
      pageToken: options.pageToken,
      singleEvents: true,
      orderBy: "startTime",
    });

    const meetings = (response.data.items || []).map((event) => {
      const meetLink = event.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri ?? null;

      return {
        id: event.id!,
        summary: event.summary || "",
        description: event.description || null,
        start: new Date(event.start?.dateTime || event.start?.date || ""),
        end: new Date(event.end?.dateTime || event.end?.date || ""),
        meetLink,
        attendees: (event.attendees || []).map((a) => a.email!).filter(Boolean),
        htmlLink: event.htmlLink!,
      };
    });

    return {
      meetings,
      nextPageToken: response.data.nextPageToken || null,
    };
  },

  /**
   * Get meetings with Meet links only (filtered)
   */
  async getMeetingsWithMeet(
    workspaceId: string,
    options: {
      maxResults?: number;
      pageToken?: string;
      timeMin?: Date;
      timeMax?: Date;
    } = {}
  ): Promise<{
    meetings: Array<{
      id: string;
      summary: string;
      description: string | null;
      start: Date;
      end: Date;
      meetLink: string;
      attendees: string[];
      htmlLink: string;
    }>;
    nextPageToken: string | null;
  }> {
    const result = await this.getMeetings(workspaceId, options);

    // Filter to only meetings with Meet links
    const meetingsWithMeet = result.meetings.filter(
      (m): m is typeof m & { meetLink: string } => m.meetLink !== null
    );

    return {
      meetings: meetingsWithMeet,
      nextPageToken: result.nextPageToken,
    };
  },
};
