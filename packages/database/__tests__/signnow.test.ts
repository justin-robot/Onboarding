import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signNowService } from "../services/signnow";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the storage module
vi.mock("@repo/storage", () => ({
  getPresignedDownloadUrl: vi.fn().mockResolvedValue("https://storage.example.com/file.pdf"),
  getStorageConfig: vi.fn().mockReturnValue({}),
}));

describe("SignNowService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isConfigured", () => {
    it("should return false when credentials are missing", () => {
      delete process.env.SIGNNOW_CLIENT_CREDENTIALS;
      delete process.env.SIGNNOW_USERNAME;
      delete process.env.SIGNNOW_PASSWORD;

      expect(signNowService.isConfigured()).toBe(false);
    });

    it("should return true when all credentials are set", () => {
      process.env.SIGNNOW_CLIENT_CREDENTIALS = "test_creds";
      process.env.SIGNNOW_USERNAME = "test_user";
      process.env.SIGNNOW_PASSWORD = "test_pass";

      expect(signNowService.isConfigured()).toBe(true);
    });

    it("should return false when only some credentials are set", () => {
      process.env.SIGNNOW_CLIENT_CREDENTIALS = "test_creds";
      delete process.env.SIGNNOW_USERNAME;
      delete process.env.SIGNNOW_PASSWORD;

      expect(signNowService.isConfigured()).toBe(false);
    });
  });

  describe("pushDocument", () => {
    it("should throw when not configured", async () => {
      delete process.env.SIGNNOW_CLIENT_CREDENTIALS;

      await expect(
        signNowService.pushDocument("file_123", "signer@example.com")
      ).rejects.toThrow("SignNow is not configured");
    });
  });

  describe("getDocumentStatus", () => {
    it("should throw when not configured", async () => {
      delete process.env.SIGNNOW_CLIENT_CREDENTIALS;

      await expect(
        signNowService.getDocumentStatus("doc_123")
      ).rejects.toThrow("SignNow is not configured");
    });
  });

  describe("getSignedDocumentUrl", () => {
    it("should throw when not configured", async () => {
      delete process.env.SIGNNOW_CLIENT_CREDENTIALS;

      await expect(
        signNowService.getSignedDocumentUrl("doc_123")
      ).rejects.toThrow("SignNow is not configured");
    });
  });

  describe("cancelDocument", () => {
    it("should throw when not configured", async () => {
      delete process.env.SIGNNOW_CLIENT_CREDENTIALS;

      await expect(
        signNowService.cancelDocument("doc_123")
      ).rejects.toThrow("SignNow is not configured");
    });
  });
});
