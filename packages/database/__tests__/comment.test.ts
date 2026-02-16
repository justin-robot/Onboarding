import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { database } from "../index";
import { commentService } from "../services/comment";

// Test IDs with timestamps to avoid collisions
const TEST_WORKSPACE_ID = "ws_comment_test_" + Date.now();
const TEST_USER_ID = "user_comment_test_" + Date.now();
const TEST_USER_2_ID = "user_comment_test_2_" + Date.now();
const TEST_SECTION_ID = "sec_comment_test_" + Date.now();
const TEST_TASK_ID = "task_comment_test_" + Date.now();

describe("CommentService", () => {
  beforeAll(async () => {
    // Create test users
    await database
      .insertInto("user")
      .values([
        {
          id: TEST_USER_ID,
          name: "Comment Test User",
          email: `comment-test-${Date.now()}@example.com`,
          emailVerified: true,
          banned: false,
        },
        {
          id: TEST_USER_2_ID,
          name: "Comment Test User 2",
          email: `comment-test-2-${Date.now()}@example.com`,
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
        name: "Comment Test Workspace",
      })
      .execute();

    // Create test section
    await database
      .insertInto("section")
      .values({
        id: TEST_SECTION_ID,
        workspaceId: TEST_WORKSPACE_ID,
        title: "Comment Test Section",
        position: 0,
      })
      .execute();

    // Create test task
    await database
      .insertInto("task")
      .values({
        id: TEST_TASK_ID,
        sectionId: TEST_SECTION_ID,
        title: "Comment Test Task",
        type: "FORM",
        position: 0,
      })
      .execute();
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    await database
      .deleteFrom("comment")
      .where("taskId", "=", TEST_TASK_ID)
      .execute();

    await database
      .deleteFrom("task")
      .where("id", "=", TEST_TASK_ID)
      .execute();

    await database
      .deleteFrom("section")
      .where("id", "=", TEST_SECTION_ID)
      .execute();

    await database
      .deleteFrom("workspace")
      .where("id", "=", TEST_WORKSPACE_ID)
      .execute();

    await database
      .deleteFrom("user")
      .where("id", "in", [TEST_USER_ID, TEST_USER_2_ID])
      .execute();
  });

  describe("create", () => {
    it("should create a comment on a task", async () => {
      const comment = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "This is a test comment",
      });

      expect(comment).toHaveProperty("id");
      expect(comment.taskId).toBe(TEST_TASK_ID);
      expect(comment.userId).toBe(TEST_USER_ID);
      expect(comment.content).toBe("This is a test comment");
      expect(comment.createdAt).toBeInstanceOf(Date);
    });

    it("should create multiple comments on the same task", async () => {
      const comment1 = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "First comment",
      });

      const comment2 = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_2_ID,
        content: "Second comment",
      });

      expect(comment1.id).not.toBe(comment2.id);
      expect(comment1.userId).toBe(TEST_USER_ID);
      expect(comment2.userId).toBe(TEST_USER_2_ID);
    }, 15000);
  });

  describe("getByTaskId", () => {
    beforeAll(async () => {
      // Create some comments for testing
      for (let i = 0; i < 5; i++) {
        await commentService.create({
          taskId: TEST_TASK_ID,
          userId: TEST_USER_ID,
          content: `Test comment ${i + 1}`,
        });
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    it("should return all comments for a task in chronological order", async () => {
      const comments = await commentService.getByTaskId(TEST_TASK_ID);

      expect(comments.length).toBeGreaterThanOrEqual(5);

      // Check chronological order (oldest first for comments)
      for (let i = 1; i < comments.length; i++) {
        const prev = new Date(comments[i - 1].createdAt).getTime();
        const curr = new Date(comments[i].createdAt).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it("should include user info with each comment", async () => {
      const comments = await commentService.getByTaskId(TEST_TASK_ID);

      const comment = comments.find((c) => c.userId === TEST_USER_ID);
      expect(comment).toBeDefined();
      expect(comment!.userName).toBe("Comment Test User");
    });

    it("should return empty array for task with no comments", async () => {
      const comments = await commentService.getByTaskId("non_existent_task");
      expect(comments).toEqual([]);
    });

    it("should not return soft-deleted comments", async () => {
      // Create and delete a comment
      const comment = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "Comment to delete",
      });

      await commentService.delete(comment.id, TEST_USER_ID);

      const comments = await commentService.getByTaskId(TEST_TASK_ID);
      const found = comments.find((c) => c.id === comment.id);
      expect(found).toBeUndefined();
    });
  });

  describe("getById", () => {
    it("should return a comment by ID", async () => {
      const created = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "Get by ID test",
      });

      const comment = await commentService.getById(created.id);
      expect(comment).not.toBeNull();
      expect(comment!.id).toBe(created.id);
      expect(comment!.content).toBe("Get by ID test");
    });

    it("should return null for non-existent comment", async () => {
      const comment = await commentService.getById("non_existent_id");
      expect(comment).toBeNull();
    });

    it("should return null for soft-deleted comment", async () => {
      const created = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "To be deleted",
      });

      await commentService.delete(created.id, TEST_USER_ID);

      const comment = await commentService.getById(created.id);
      expect(comment).toBeNull();
    });
  });

  describe("delete", () => {
    it("should soft delete a comment", async () => {
      const created = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "Comment to delete",
      });

      const deleted = await commentService.delete(created.id, TEST_USER_ID);
      expect(deleted).toBe(true);

      // Comment should not be retrievable
      const comment = await commentService.getById(created.id);
      expect(comment).toBeNull();
    });

    it("should not allow deleting another user's comment", async () => {
      const created = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "Protected comment",
      });

      const deleted = await commentService.delete(created.id, TEST_USER_2_ID);
      expect(deleted).toBe(false);

      // Comment should still exist
      const comment = await commentService.getById(created.id);
      expect(comment).not.toBeNull();
    });

    it("should return false for non-existent comment", async () => {
      const deleted = await commentService.delete("non_existent_id", TEST_USER_ID);
      expect(deleted).toBe(false);
    });
  });

  describe("getCountByTaskId", () => {
    it("should return the comment count for a task", async () => {
      const count = await commentService.getCountByTaskId(TEST_TASK_ID);
      expect(count).toBeGreaterThan(0);
    });

    it("should return 0 for task with no comments", async () => {
      const count = await commentService.getCountByTaskId("non_existent_task");
      expect(count).toBe(0);
    });

    it("should not count soft-deleted comments", async () => {
      const initialCount = await commentService.getCountByTaskId(TEST_TASK_ID);

      const comment = await commentService.create({
        taskId: TEST_TASK_ID,
        userId: TEST_USER_ID,
        content: "Temp comment for count test",
      });

      const afterCreate = await commentService.getCountByTaskId(TEST_TASK_ID);
      expect(afterCreate).toBe(initialCount + 1);

      await commentService.delete(comment.id, TEST_USER_ID);

      const afterDelete = await commentService.getCountByTaskId(TEST_TASK_ID);
      expect(afterDelete).toBe(initialCount);
    });
  });
});
