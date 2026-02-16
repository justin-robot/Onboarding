import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { database } from "../index";

// Mock Ably
const mockPublish = vi.fn();
const mockCreateTokenRequest = vi.fn();

vi.mock("ably", () => ({
  default: {
    Rest: vi.fn().mockImplementation(() => ({
      auth: {
        createTokenRequest: mockCreateTokenRequest,
      },
      channels: {
        get: vi.fn().mockReturnValue({
          publish: mockPublish,
        }),
      },
    })),
  },
}));

// Set API key for tests
process.env.ABLY_API_KEY = "test-api-key";

import {
  ablyService,
  CHANNELS,
  WORKSPACE_EVENTS,
  CHAT_EVENTS,
  USER_EVENTS,
} from "../services/ably";

// Test IDs
const TEST_WORKSPACE_ID = "ws_ably_test_" + Date.now();
const TEST_USER_ID = "user_ably_test_" + Date.now();

describe("AblyService", () => {
  beforeAll(async () => {
    // Create test user
    await database
      .insertInto("user")
      .values({
        id: TEST_USER_ID,
        name: "Ably Test User",
        email: `ably-test-${Date.now()}@example.com`,
        emailVerified: true,
        banned: false,
      })
      .execute();

    // Create test workspace
    await database
      .insertInto("workspace")
      .values({
        id: TEST_WORKSPACE_ID,
        name: "Ably Test Workspace",
      })
      .execute();

    // Add user as workspace member
    await database
      .insertInto("workspace_member")
      .values({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        role: "user",
      })
      .execute();
  });

  afterAll(async () => {
    // Clean up
    await database
      .deleteFrom("workspace_member")
      .where("workspaceId", "=", TEST_WORKSPACE_ID)
      .execute();

    await database
      .deleteFrom("workspace")
      .where("id", "=", TEST_WORKSPACE_ID)
      .execute();

    await database
      .deleteFrom("user")
      .where("id", "=", TEST_USER_ID)
      .execute();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CHANNELS", () => {
    it("should generate correct workspace channel name", () => {
      expect(CHANNELS.workspace("ws_123")).toBe("workspace:ws_123");
    });

    it("should generate correct workspace chat channel name", () => {
      expect(CHANNELS.workspaceChat("ws_123")).toBe("workspace:ws_123:chat");
    });

    it("should generate correct user channel name", () => {
      expect(CHANNELS.user("user_123")).toBe("user:user_123");
    });
  });

  describe("parseChannel", () => {
    it("should parse workspace channel", () => {
      const result = ablyService.parseChannel("workspace:ws_123");
      expect(result.type).toBe("workspace");
      expect(result.id).toBe("ws_123");
    });

    it("should parse workspace chat channel", () => {
      const result = ablyService.parseChannel("workspace:ws_123:chat");
      expect(result.type).toBe("workspace_chat");
      expect(result.id).toBe("ws_123");
    });

    it("should parse user channel", () => {
      const result = ablyService.parseChannel("user:user_123");
      expect(result.type).toBe("user");
      expect(result.id).toBe("user_123");
    });

    it("should return unknown for invalid channel", () => {
      const result = ablyService.parseChannel("invalid:channel");
      expect(result.type).toBe("unknown");
      expect(result.id).toBe("");
    });
  });

  describe("createTokenRequest", () => {
    it("should create token request for valid workspace member", async () => {
      mockCreateTokenRequest.mockResolvedValue({
        token: "test-token",
        timestamp: Date.now(),
        ttl: 3600000,
      });

      const result = await ablyService.createTokenRequest(TEST_USER_ID, TEST_WORKSPACE_ID);

      expect(result).not.toBeNull();
      expect(result!.clientId).toBe(TEST_USER_ID);
      expect(mockCreateTokenRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: TEST_USER_ID,
        })
      );
    });

    it("should throw error for non-member", async () => {
      await expect(
        ablyService.createTokenRequest("non_member_user", TEST_WORKSPACE_ID)
      ).rejects.toThrow("User is not a member of this workspace");
    });

    it("should include correct capabilities in token", async () => {
      mockCreateTokenRequest.mockResolvedValue({
        token: "test-token",
        timestamp: Date.now(),
        ttl: 3600000,
      });

      await ablyService.createTokenRequest(TEST_USER_ID, TEST_WORKSPACE_ID);

      expect(mockCreateTokenRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          capability: expect.stringContaining(`workspace:${TEST_WORKSPACE_ID}`),
        })
      );
    });
  });

  describe("broadcast", () => {
    it("should publish event to channel", async () => {
      mockPublish.mockResolvedValue(undefined);

      const result = await ablyService.broadcast(
        "workspace:ws_123",
        "task:created",
        { id: "task_1" }
      );

      expect(result).toBe(true);
      expect(mockPublish).toHaveBeenCalledWith("task:created", { id: "task_1" });
    });

    it("should return false on publish error", async () => {
      mockPublish.mockRejectedValue(new Error("Publish failed"));

      const result = await ablyService.broadcast(
        "workspace:ws_123",
        "task:created",
        { id: "task_1" }
      );

      expect(result).toBe(false);
    });
  });

  describe("broadcastToWorkspace", () => {
    it("should broadcast to correct workspace channel", async () => {
      mockPublish.mockResolvedValue(undefined);

      await ablyService.broadcastToWorkspace(
        "ws_123",
        WORKSPACE_EVENTS.TASK_CREATED,
        { id: "task_1" }
      );

      expect(mockPublish).toHaveBeenCalledWith(
        WORKSPACE_EVENTS.TASK_CREATED,
        { id: "task_1" }
      );
    });
  });

  describe("broadcastToChat", () => {
    it("should broadcast to correct chat channel", async () => {
      mockPublish.mockResolvedValue(undefined);

      await ablyService.broadcastToChat(
        "ws_123",
        CHAT_EVENTS.MESSAGE_SENT,
        { content: "Hello" }
      );

      expect(mockPublish).toHaveBeenCalledWith(
        CHAT_EVENTS.MESSAGE_SENT,
        { content: "Hello" }
      );
    });
  });

  describe("broadcastToUser", () => {
    it("should broadcast to correct user channel", async () => {
      mockPublish.mockResolvedValue(undefined);

      await ablyService.broadcastToUser(
        "user_123",
        USER_EVENTS.NOTIFICATION,
        { message: "You have a new task" }
      );

      expect(mockPublish).toHaveBeenCalledWith(
        USER_EVENTS.NOTIFICATION,
        { message: "You have a new task" }
      );
    });
  });

  describe("Event constants", () => {
    it("should have all workspace events", () => {
      expect(WORKSPACE_EVENTS.TASK_CREATED).toBe("task:created");
      expect(WORKSPACE_EVENTS.TASK_UPDATED).toBe("task:updated");
      expect(WORKSPACE_EVENTS.TASK_DELETED).toBe("task:deleted");
      expect(WORKSPACE_EVENTS.SECTION_CREATED).toBe("section:created");
      expect(WORKSPACE_EVENTS.FILE_UPLOADED).toBe("file:uploaded");
      expect(WORKSPACE_EVENTS.MEMBER_ADDED).toBe("member:added");
    });

    it("should have all chat events", () => {
      expect(CHAT_EVENTS.MESSAGE_SENT).toBe("message:sent");
      expect(CHAT_EVENTS.TYPING_STARTED).toBe("typing:started");
    });

    it("should have all user events", () => {
      expect(USER_EVENTS.NOTIFICATION).toBe("notification");
      expect(USER_EVENTS.WORKSPACE_INVITATION).toBe("workspace:invitation");
    });
  });
});
