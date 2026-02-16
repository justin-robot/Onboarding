import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { googleCalendarService } from "../services/googleCalendar";

// Mock googleapis
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/auth?mock"),
        getToken: vi.fn().mockResolvedValue({
          tokens: {
            access_token: "mock_access_token",
            refresh_token: "mock_refresh_token",
            expiry_date: Date.now() + 3600000,
            scope: "calendar.events calendar.readonly",
          },
        }),
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: {
            access_token: "refreshed_access_token",
            expiry_date: Date.now() + 3600000,
          },
        }),
      })),
    },
    calendar: vi.fn().mockReturnValue({
      events: {
        insert: vi.fn().mockResolvedValue({
          data: {
            id: "event_123",
            htmlLink: "https://calendar.google.com/event?id=123",
            conferenceData: {
              entryPoints: [
                { entryPointType: "video", uri: "https://meet.google.com/abc-def-ghi" },
              ],
            },
          },
        }),
        delete: vi.fn().mockResolvedValue({}),
        list: vi.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: "event_1",
                summary: "Team Standup",
                description: "Daily standup",
                start: { dateTime: new Date().toISOString() },
                end: { dateTime: new Date().toISOString() },
                htmlLink: "https://calendar.google.com/event?id=1",
                conferenceData: {
                  entryPoints: [
                    { entryPointType: "video", uri: "https://meet.google.com/abc-def-ghi" },
                  ],
                },
                attendees: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
              },
              {
                id: "event_2",
                summary: "Review Meeting",
                start: { dateTime: new Date().toISOString() },
                end: { dateTime: new Date().toISOString() },
                htmlLink: "https://calendar.google.com/event?id=2",
              },
            ],
            nextPageToken: "next_page_123",
          },
        }),
        get: vi.fn().mockResolvedValue({
          data: {
            id: "event_123",
            summary: "Test Meeting",
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date().toISOString() },
            conferenceData: {
              entryPoints: [
                { entryPointType: "video", uri: "https://meet.google.com/abc-def-ghi" },
              ],
            },
          },
        }),
      },
    }),
  },
}));

describe("GoogleCalendarService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isConfigured", () => {
    it("should return false when credentials are missing", () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_REDIRECT_URI;
      delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

      expect(googleCalendarService.isConfigured()).toBe(false);
    });

    it("should return true when all credentials are set", () => {
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback";
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "a".repeat(64); // 32 bytes in hex

      expect(googleCalendarService.isConfigured()).toBe(true);
    });
  });

  describe("createState / parseState", () => {
    it("should create and parse state correctly", () => {
      const workspaceId = "ws_123";
      const userId = "user_456";

      const state = googleCalendarService.createState(workspaceId, userId);
      const parsed = googleCalendarService.parseState(state);

      expect(parsed).toEqual({ workspaceId, userId });
    });

    it("should return null for invalid state", () => {
      expect(googleCalendarService.parseState("invalid")).toBeNull();
      expect(googleCalendarService.parseState("")).toBeNull();
    });
  });

  describe("getAuthUrl", () => {
    it("should throw when not configured", () => {
      delete process.env.GOOGLE_CLIENT_ID;

      expect(() =>
        googleCalendarService.getAuthUrl("test-state")
      ).toThrow("Google OAuth not configured");
    });

    it("should generate auth URL when configured", () => {
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback";

      const url = googleCalendarService.getAuthUrl("test-state");
      expect(url).toContain("accounts.google.com");
    });
  });

  describe("getIntegration", () => {
    it("should return null for non-existent workspace", async () => {
      const result = await googleCalendarService.getIntegration("non_existent_ws");
      expect(result).toBeNull();
    });
  });

  describe("isConnected", () => {
    it("should return false for non-connected workspace", async () => {
      const result = await googleCalendarService.isConnected("non_existent_ws");
      expect(result).toBe(false);
    });
  });
});
