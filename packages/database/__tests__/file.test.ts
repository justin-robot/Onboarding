import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { database } from "../index";

// Mock the storage package
vi.mock("@repo/storage", () => ({
  getStorageConfig: vi.fn(() => ({
    provider: "s3",
    bucket: "test-bucket",
    region: "us-east-1",
  })),
  getPresignedUploadUrl: vi.fn(
    (_config, key, _options) =>
      Promise.resolve(`https://test-bucket.s3.amazonaws.com/${key}?signed=true`)
  ),
  getPresignedDownloadUrl: vi.fn(
    (_config, key, _expiresIn) =>
      Promise.resolve(`https://test-bucket.s3.amazonaws.com/${key}?download=true`)
  ),
  deleteFile: vi.fn(() => Promise.resolve()),
  getFileUrl: vi.fn(
    (_config, key) => `https://test-bucket.s3.amazonaws.com/${key}`
  ),
}));

// Import after mocking
import { fileService } from "../services/file";

// Test workspace and user IDs
const TEST_WORKSPACE_ID = "ws_file_test_" + Date.now();
const TEST_USER_ID = "user_file_test_" + Date.now();

describe("FileService", () => {
  beforeAll(async () => {
    // Create test user
    await database
      .insertInto("user")
      .values({
        id: TEST_USER_ID,
        name: "File Test User",
        email: `file-test-${Date.now()}@example.com`,
        emailVerified: true,
        banned: false,
      })
      .execute();

    // Create test workspace
    await database
      .insertInto("workspace")
      .values({
        id: TEST_WORKSPACE_ID,
        name: "File Test Workspace",
      })
      .execute();
  });

  afterAll(async () => {
    // Clean up test files
    await database
      .deleteFrom("file")
      .where("workspaceId", "=", TEST_WORKSPACE_ID)
      .execute();

    // Clean up test workspace
    await database
      .deleteFrom("workspace")
      .where("id", "=", TEST_WORKSPACE_ID)
      .execute();

    // Clean up test user
    await database
      .deleteFrom("user")
      .where("id", "=", TEST_USER_ID)
      .execute();
  });

  describe("getPresignedUploadUrl", () => {
    it("should generate a presigned URL and storage key", async () => {
      const result = await fileService.getPresignedUploadUrl(
        TEST_WORKSPACE_ID,
        "test-document.pdf",
        "application/pdf"
      );

      expect(result).toHaveProperty("uploadUrl");
      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("expiresIn");

      // URL should be valid
      expect(result.uploadUrl).toMatch(/^https?:\/\//);

      // Key should contain workspace ID and sanitized filename
      expect(result.key).toContain(TEST_WORKSPACE_ID);
      expect(result.key).toContain("test-document.pdf");

      // Default expiration
      expect(result.expiresIn).toBe(3600);
    });

    it("should sanitize filenames with special characters", async () => {
      const result = await fileService.getPresignedUploadUrl(
        TEST_WORKSPACE_ID,
        "My Document (Final)!@#.pdf",
        "application/pdf"
      );

      // Key should not contain special characters
      expect(result.key).not.toMatch(/[()!@#\s]/);
      expect(result.key).toContain(".pdf");
    });

    it("should respect custom expiration time", async () => {
      const customExpiry = 7200;
      const result = await fileService.getPresignedUploadUrl(
        TEST_WORKSPACE_ID,
        "test.txt",
        "text/plain",
        customExpiry
      );

      expect(result.expiresIn).toBe(customExpiry);
    });
  });

  describe("confirmUpload", () => {
    it("should create a File record", async () => {
      const storageKey = `${TEST_WORKSPACE_ID}/2024/01/test-uuid-document.pdf`;

      const file = await fileService.confirmUpload({
        key: storageKey,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Test Document.pdf",
        mimeType: "application/pdf",
        size: 12345,
        sourceType: "upload",
      });

      expect(file).toHaveProperty("id");
      expect(file.workspaceId).toBe(TEST_WORKSPACE_ID);
      expect(file.uploadedBy).toBe(TEST_USER_ID);
      expect(file.name).toBe("Test Document.pdf");
      expect(file.mimeType).toBe("application/pdf");
      expect(file.size).toBe(12345);
      expect(file.storageKey).toBe(storageKey);
      expect(file.sourceType).toBe("upload");
      expect(file.thumbnailKey).toBeNull();
      expect(file.deletedAt).toBeNull();
    });

    it("should create a File record with task attachment source type", async () => {
      const storageKey = `${TEST_WORKSPACE_ID}/2024/01/task-attachment.jpg`;

      // Create without sourceTaskId to avoid FK constraint
      // In real usage, sourceTaskId would be a valid task ID
      const file = await fileService.confirmUpload({
        key: storageKey,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Screenshot.jpg",
        mimeType: "image/jpeg",
        size: 54321,
        sourceType: "task_attachment",
      });

      expect(file.sourceType).toBe("task_attachment");
      expect(file.sourceTaskId).toBeNull();
    });
  });

  describe("getById", () => {
    it("should return a file by ID", async () => {
      // Create a file
      const created = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/get-by-id-test.txt`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Get By ID Test.txt",
        mimeType: "text/plain",
        size: 100,
        sourceType: "upload",
      });

      // Retrieve it
      const file = await fileService.getById(created.id);

      expect(file).not.toBeNull();
      expect(file!.id).toBe(created.id);
      expect(file!.name).toBe("Get By ID Test.txt");
    });

    it("should return null for non-existent file", async () => {
      const file = await fileService.getById("non_existent_id");
      expect(file).toBeNull();
    });

    it("should return null for soft-deleted file", async () => {
      // Create and delete a file
      const created = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/deleted-test.txt`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Deleted Test.txt",
        mimeType: "text/plain",
        size: 100,
        sourceType: "upload",
      });

      await fileService.delete(created.id);

      const file = await fileService.getById(created.id);
      expect(file).toBeNull();
    });
  });

  describe("getByIdWithUrl", () => {
    it("should return file with download URL", async () => {
      const created = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/download-url-test.txt`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Download URL Test.txt",
        mimeType: "text/plain",
        size: 100,
        sourceType: "upload",
      });

      const file = await fileService.getByIdWithUrl(created.id);

      expect(file).not.toBeNull();
      expect(file!.downloadUrl).toMatch(/^https?:\/\//);
      expect(file!.downloadUrl).toContain("download=true");
    });
  });

  describe("getByWorkspaceId", () => {
    it("should return all files for a workspace", async () => {
      const files = await fileService.getByWorkspaceId(TEST_WORKSPACE_ID);

      expect(Array.isArray(files)).toBe(true);
      // Should have at least the files we created in previous tests
      expect(files.length).toBeGreaterThan(0);

      // All files should belong to the test workspace
      files.forEach((file) => {
        expect(file.workspaceId).toBe(TEST_WORKSPACE_ID);
        expect(file.deletedAt).toBeNull();
      });
    });
  });

  describe("getByTaskId", () => {
    it("should return empty array for task with no files", async () => {
      // Test that getByTaskId returns empty array when no files match
      const files = await fileService.getByTaskId("nonexistent_task_id");
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });
  });

  describe("updateThumbnailKey", () => {
    it("should update the thumbnail key", async () => {
      const created = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/thumbnail-test.jpg`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Thumbnail Test.jpg",
        mimeType: "image/jpeg",
        size: 50000,
        sourceType: "upload",
      });

      const thumbnailKey = `${TEST_WORKSPACE_ID}/thumbnails/thumb-${created.id}.jpg`;
      const updated = await fileService.updateThumbnailKey(created.id, thumbnailKey);

      expect(updated).not.toBeNull();
      expect(updated!.thumbnailKey).toBe(thumbnailKey);
    });
  });

  describe("delete (soft)", () => {
    it("should soft delete a file", async () => {
      const created = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/soft-delete-test.txt`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Soft Delete Test.txt",
        mimeType: "text/plain",
        size: 100,
        sourceType: "upload",
      });

      const result = await fileService.delete(created.id);
      expect(result).toBe(true);

      // File should not be retrievable
      const file = await fileService.getById(created.id);
      expect(file).toBeNull();

      // But should still exist in database with deletedAt set
      const rawFile = await database
        .selectFrom("file")
        .selectAll()
        .where("id", "=", created.id)
        .executeTakeFirst();

      expect(rawFile).not.toBeUndefined();
      expect(rawFile!.deletedAt).not.toBeNull();
    });

    it("should return false for non-existent file", async () => {
      const result = await fileService.delete("non_existent_id");
      expect(result).toBe(false);
    });
  });

  describe("replaceFile", () => {
    it("should create new version with previousVersionId", async () => {
      // Create original file
      const original = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/original-doc.pdf`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Original Document.pdf",
        mimeType: "application/pdf",
        size: 10000,
        sourceType: "upload",
      });

      // Replace with new version
      const newVersion = await fileService.replaceFile(original.id, `${TEST_WORKSPACE_ID}/2024/01/v2-doc.pdf`, {
        uploadedBy: TEST_USER_ID,
        name: "Document v2.pdf",
        mimeType: "application/pdf",
        size: 12000,
      });

      expect(newVersion).not.toBeNull();
      expect(newVersion!.previousVersionId).toBe(original.id);
      expect(newVersion!.name).toBe("Document v2.pdf");
      expect(newVersion!.size).toBe(12000);
      expect(newVersion!.workspaceId).toBe(original.workspaceId);
      expect(newVersion!.sourceType).toBe(original.sourceType);
    });

    it("should return null for non-existent file", async () => {
      const result = await fileService.replaceFile("non_existent", "new-key", {
        uploadedBy: TEST_USER_ID,
        name: "New.pdf",
        mimeType: "application/pdf",
        size: 1000,
      });

      expect(result).toBeNull();
    });
  });

  describe("getVersionHistory", () => {
    it("should return version chain from newest to oldest", async () => {
      // Create v1
      const v1 = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/history-v1.pdf`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "History v1.pdf",
        mimeType: "application/pdf",
        size: 1000,
        sourceType: "upload",
      });

      // Create v2
      const v2 = await fileService.replaceFile(v1.id, `${TEST_WORKSPACE_ID}/2024/01/history-v2.pdf`, {
        uploadedBy: TEST_USER_ID,
        name: "History v2.pdf",
        mimeType: "application/pdf",
        size: 2000,
      });

      // Create v3
      const v3 = await fileService.replaceFile(v2!.id, `${TEST_WORKSPACE_ID}/2024/01/history-v3.pdf`, {
        uploadedBy: TEST_USER_ID,
        name: "History v3.pdf",
        mimeType: "application/pdf",
        size: 3000,
      });

      // Get history from latest version
      const history = await fileService.getVersionHistory(v3!.id);

      expect(history.length).toBe(3);
      expect(history[0].id).toBe(v3!.id);
      expect(history[1].id).toBe(v2!.id);
      expect(history[2].id).toBe(v1.id);
    });

    it("should return single file for file with no history", async () => {
      const single = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/single-file.pdf`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Single.pdf",
        mimeType: "application/pdf",
        size: 500,
        sourceType: "upload",
      });

      const history = await fileService.getVersionHistory(single.id);

      expect(history.length).toBe(1);
      expect(history[0].id).toBe(single.id);
    });
  });

  describe("getLatestVersion", () => {
    it("should return the newest version", async () => {
      // Create v1
      const v1 = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/latest-v1.pdf`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Latest v1.pdf",
        mimeType: "application/pdf",
        size: 1000,
        sourceType: "upload",
      });

      // Create v2
      const v2 = await fileService.replaceFile(v1.id, `${TEST_WORKSPACE_ID}/2024/01/latest-v2.pdf`, {
        uploadedBy: TEST_USER_ID,
        name: "Latest v2.pdf",
        mimeType: "application/pdf",
        size: 2000,
      });

      // Get latest from v1 (old version)
      const latest = await fileService.getLatestVersion(v1.id);

      expect(latest).not.toBeNull();
      expect(latest!.id).toBe(v2!.id);
    });
  });

  describe("getOriginalVersion", () => {
    it("should return the oldest version", async () => {
      // Create v1
      const v1 = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/orig-v1.pdf`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Orig v1.pdf",
        mimeType: "application/pdf",
        size: 1000,
        sourceType: "upload",
      });

      // Create v2
      const v2 = await fileService.replaceFile(v1.id, `${TEST_WORKSPACE_ID}/2024/01/orig-v2.pdf`, {
        uploadedBy: TEST_USER_ID,
        name: "Orig v2.pdf",
        mimeType: "application/pdf",
        size: 2000,
      });

      // Get original from v2 (new version)
      const original = await fileService.getOriginalVersion(v2!.id);

      expect(original).not.toBeNull();
      expect(original!.id).toBe(v1.id);
    });
  });

  describe("getVersionCount", () => {
    it("should return correct version count", async () => {
      const v1 = await fileService.confirmUpload({
        key: `${TEST_WORKSPACE_ID}/2024/01/count-v1.pdf`,
        workspaceId: TEST_WORKSPACE_ID,
        uploadedBy: TEST_USER_ID,
        name: "Count v1.pdf",
        mimeType: "application/pdf",
        size: 1000,
        sourceType: "upload",
      });

      const v2 = await fileService.replaceFile(v1.id, `${TEST_WORKSPACE_ID}/2024/01/count-v2.pdf`, {
        uploadedBy: TEST_USER_ID,
        name: "Count v2.pdf",
        mimeType: "application/pdf",
        size: 2000,
      });

      const count = await fileService.getVersionCount(v2!.id);
      expect(count).toBe(2);
    });
  });
});
