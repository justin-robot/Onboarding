import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { database } from "../index";
import { chatService } from "../services/chat";

// Test IDs
const TEST_WORKSPACE_ID = "ws_chat_test_" + Date.now();
const TEST_USER_ID = "user_chat_test_" + Date.now();
const TEST_USER_2_ID = "user_chat_test_2_" + Date.now();
const SYSTEM_USER_ID = "system";

describe("ChatService", () => {
  beforeAll(async () => {
    // Create test users (including system user for system messages)
    await database
      .insertInto("user")
      .values([
        {
          id: TEST_USER_ID,
          name: "Chat Test User",
          email: `chat-test-${Date.now()}@example.com`,
          emailVerified: true,
          banned: false,
        },
        {
          id: TEST_USER_2_ID,
          name: "Chat Test User 2",
          email: `chat-test-2-${Date.now()}@example.com`,
          emailVerified: true,
          banned: false,
        },
        {
          id: SYSTEM_USER_ID,
          name: "System",
          email: `system-${Date.now()}@example.com`,
          emailVerified: true,
          banned: false,
        },
      ])
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();

    // Create test workspace
    await database
      .insertInto("workspace")
      .values({
        id: TEST_WORKSPACE_ID,
        name: "Chat Test Workspace",
      })
      .execute();
  });

  afterAll(async () => {
    // Clean up messages
    await database
      .deleteFrom("message")
      .where("workspaceId", "=", TEST_WORKSPACE_ID)
      .execute();

    // Clean up workspace
    await database
      .deleteFrom("workspace")
      .where("id", "=", TEST_WORKSPACE_ID)
      .execute();

    // Clean up users (system user may be shared, use try/catch)
    await database
      .deleteFrom("user")
      .where("id", "in", [TEST_USER_ID, TEST_USER_2_ID])
      .execute();

    // Only delete system user if it was created by this test
    await database
      .deleteFrom("user")
      .where("id", "=", SYSTEM_USER_ID)
      .execute()
      .catch(() => {/* ignore if doesn't exist */});
  });

  describe("sendMessage", () => {
    it("should send a text message", async () => {
      const message = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "Hello, world!",
      });

      expect(message).toHaveProperty("id");
      expect(message.workspaceId).toBe(TEST_WORKSPACE_ID);
      expect(message.userId).toBe(TEST_USER_ID);
      expect(message.content).toBe("Hello, world!");
      expect(message.type).toBe("text");
    });

    it("should send an annotation message", async () => {
      const message = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "Check out this task",
        type: "annotation",
      });

      expect(message.type).toBe("annotation");
      expect(message.content).toBe("Check out this task");
    });

    it("should send a message with attachments", async () => {
      const message = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "Here are some files",
        attachmentIds: ["file_1", "file_2"],
      });

      expect(message.attachmentIds).toEqual(["file_1", "file_2"]);
    });
  });

  describe("sendSystemMessage", () => {
    it("should send a system message", async () => {
      const message = await chatService.sendSystemMessage(
        TEST_WORKSPACE_ID,
        "Task completed by user"
      );

      expect(message.type).toBe("system");
      expect(message.userId).toBe("system");
      expect(message.content).toBe("Task completed by user");
    });
  });

  describe("getMessages", () => {
    beforeAll(async () => {
      // Create a batch of messages for pagination testing
      for (let i = 0; i < 15; i++) {
        await chatService.sendMessage({
          workspaceId: TEST_WORKSPACE_ID,
          userId: TEST_USER_ID,
          content: `Message ${i + 1}`,
        });
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    it("should return messages in reverse chronological order", async () => {
      const result = await chatService.getMessages(TEST_WORKSPACE_ID, undefined, 10);

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages.length).toBeLessThanOrEqual(10);

      // Check order (newest first)
      for (let i = 1; i < result.messages.length; i++) {
        expect(
          new Date(result.messages[i - 1].createdAt).getTime()
        ).toBeGreaterThanOrEqual(
          new Date(result.messages[i].createdAt).getTime()
        );
      }
    });

    it("should support cursor-based pagination", async () => {
      // Get first page
      const page1 = await chatService.getMessages(TEST_WORKSPACE_ID, undefined, 5);
      expect(page1.messages.length).toBe(5);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).not.toBeNull();

      // Get second page using cursor
      const page2 = await chatService.getMessages(
        TEST_WORKSPACE_ID,
        page1.nextCursor!,
        5
      );
      expect(page2.messages.length).toBe(5);

      // Messages should not overlap
      const page1Ids = page1.messages.map((m) => m.id);
      const page2Ids = page2.messages.map((m) => m.id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);

      // Page 2 messages should be older than page 1
      const oldestPage1 = new Date(
        page1.messages[page1.messages.length - 1].createdAt
      ).getTime();
      const newestPage2 = new Date(page2.messages[0].createdAt).getTime();
      expect(oldestPage1).toBeGreaterThanOrEqual(newestPage2);
    });

    it("should include user info in messages", async () => {
      const result = await chatService.getMessages(TEST_WORKSPACE_ID, undefined, 5);

      const userMessage = result.messages.find((m) => m.userId === TEST_USER_ID);
      expect(userMessage).toBeDefined();
      expect(userMessage!.userName).toBe("Chat Test User");
    });

    it("should respect limit parameter", async () => {
      const result = await chatService.getMessages(TEST_WORKSPACE_ID, undefined, 3);
      expect(result.messages.length).toBe(3);
    });
  });

  describe("getById", () => {
    it("should return a message by ID", async () => {
      const created = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "Get by ID test",
      });

      const message = await chatService.getById(created.id);
      expect(message).not.toBeNull();
      expect(message!.id).toBe(created.id);
    });

    it("should return null for non-existent message", async () => {
      const message = await chatService.getById("non_existent_id");
      expect(message).toBeNull();
    });
  });

  describe("updateMessage", () => {
    it("should update message content", async () => {
      const created = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "Original content",
      });

      const updated = await chatService.updateMessage(
        created.id,
        "Updated content",
        TEST_USER_ID
      );

      expect(updated).not.toBeNull();
      expect(updated!.content).toBe("Updated content");
    });

    it("should not allow updating other user's message", async () => {
      const created = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "User 1 message",
      });

      const updated = await chatService.updateMessage(
        created.id,
        "Hacked content",
        TEST_USER_2_ID
      );

      expect(updated).toBeNull();

      // Verify original content unchanged
      const message = await chatService.getById(created.id);
      expect(message!.content).toBe("User 1 message");
    });
  });

  describe("deleteMessage", () => {
    it("should soft delete a message", async () => {
      const created = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "To be deleted",
      });

      const deleted = await chatService.deleteMessage(created.id, TEST_USER_ID);
      expect(deleted).toBe(true);

      // Message should not be retrievable
      const message = await chatService.getById(created.id);
      expect(message).toBeNull();
    });

    it("should not allow deleting other user's message", async () => {
      const created = await chatService.sendMessage({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        content: "Protected message",
      });

      const deleted = await chatService.deleteMessage(created.id, TEST_USER_2_ID);
      expect(deleted).toBe(false);

      // Message should still exist
      const message = await chatService.getById(created.id);
      expect(message).not.toBeNull();
    });
  });

  describe("getMessageCount", () => {
    it("should return message count for workspace", async () => {
      const count = await chatService.getMessageCount(TEST_WORKSPACE_ID);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe("getRecentMessages", () => {
    it("should return recent messages", async () => {
      const messages = await chatService.getRecentMessages(TEST_WORKSPACE_ID, 5);
      expect(messages.length).toBeLessThanOrEqual(5);
      expect(messages.length).toBeGreaterThan(0);
    });
  });
});
