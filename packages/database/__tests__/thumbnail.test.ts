import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";

// Mock the storage package
const mockUploadFile = vi.fn();
const mockGetPresignedDownloadUrl = vi.fn();

vi.mock("@repo/storage", () => ({
  getStorageConfig: vi.fn(() => ({
    provider: "s3",
    bucket: "test-bucket",
    region: "us-east-1",
  })),
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  getPresignedDownloadUrl: (...args: unknown[]) => mockGetPresignedDownloadUrl(...args),
}));

// Mock the file service
const mockUpdateThumbnailKey = vi.fn();
vi.mock("../services/file", () => ({
  fileService: {
    updateThumbnailKey: (...args: unknown[]) => mockUpdateThumbnailKey(...args),
  },
}));

// Mock fetch for downloading files
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { thumbnailService, supportsThumbnail } from "../services/thumbnail";

describe("ThumbnailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("supportsThumbnail", () => {
    it("should return true for supported image types", () => {
      expect(supportsThumbnail("image/jpeg")).toBe(true);
      expect(supportsThumbnail("image/png")).toBe(true);
      expect(supportsThumbnail("image/webp")).toBe(true);
      expect(supportsThumbnail("image/gif")).toBe(true);
      expect(supportsThumbnail("image/avif")).toBe(true);
      expect(supportsThumbnail("image/tiff")).toBe(true);
    });

    it("should return true for PDF", () => {
      expect(supportsThumbnail("application/pdf")).toBe(true);
    });

    it("should return false for unsupported types", () => {
      expect(supportsThumbnail("text/plain")).toBe(false);
      expect(supportsThumbnail("application/json")).toBe(false);
      expect(supportsThumbnail("video/mp4")).toBe(false);
      expect(supportsThumbnail("audio/mp3")).toBe(false);
      expect(supportsThumbnail("application/zip")).toBe(false);
    });
  });

  describe("generateThumbnail", () => {
    it("should return error for unsupported mime type", async () => {
      const result = await thumbnailService.generateThumbnail(
        "file_1",
        "workspace/2024/01/document.txt",
        "text/plain"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported mime type");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should generate thumbnail for JPEG image", async () => {
      // Create a test image
      const testImageBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      // Mock fetch to return the test image
      mockGetPresignedDownloadUrl.mockResolvedValue("https://storage.example.com/image.jpg");
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(testImageBuffer.buffer),
      });
      mockUploadFile.mockResolvedValue({ key: "thumbnail-key" });
      mockUpdateThumbnailKey.mockResolvedValue({ id: "file_1" });

      const result = await thumbnailService.generateThumbnail(
        "file_1",
        "workspace/2024/01/photo.jpg",
        "image/jpeg"
      );

      expect(result.success).toBe(true);
      expect(result.thumbnailKey).toContain("thumbnails");
      expect(result.thumbnailKey).toContain("thumb-");
      expect(result.thumbnailKey).toContain(".webp");

      // Verify storage upload was called
      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining("thumbnails"),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: "image/webp",
        })
      );

      // Verify file record was updated
      expect(mockUpdateThumbnailKey).toHaveBeenCalledWith(
        "file_1",
        expect.stringContaining("thumbnails")
      );
    });

    it("should generate thumbnail for PNG image", async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      mockGetPresignedDownloadUrl.mockResolvedValue("https://storage.example.com/image.png");
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(testImageBuffer.buffer),
      });
      mockUploadFile.mockResolvedValue({ key: "thumbnail-key" });
      mockUpdateThumbnailKey.mockResolvedValue({ id: "file_1" });

      const result = await thumbnailService.generateThumbnail(
        "file_1",
        "workspace/2024/01/screenshot.png",
        "image/png"
      );

      expect(result.success).toBe(true);
      expect(result.thumbnailKey).toBeDefined();
    });

    it("should handle fetch failure gracefully", async () => {
      mockGetPresignedDownloadUrl.mockResolvedValue("https://storage.example.com/image.jpg");
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await thumbnailService.generateThumbnail(
        "file_1",
        "workspace/2024/01/missing.jpg",
        "image/jpeg"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch");
    });

    it("should handle image processing failure gracefully", async () => {
      // Create invalid image data
      const invalidBuffer = Buffer.from("not an image");

      mockGetPresignedDownloadUrl.mockResolvedValue("https://storage.example.com/corrupt.jpg");
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(invalidBuffer.buffer),
      });

      const result = await thumbnailService.generateThumbnail(
        "file_1",
        "workspace/2024/01/corrupt.jpg",
        "image/jpeg"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should generate correct thumbnail key format", async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      mockGetPresignedDownloadUrl.mockResolvedValue("https://storage.example.com/image.jpg");
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(testImageBuffer.buffer),
      });
      mockUploadFile.mockResolvedValue({ key: "thumbnail-key" });
      mockUpdateThumbnailKey.mockResolvedValue({ id: "file_1" });

      const result = await thumbnailService.generateThumbnail(
        "file_1",
        "ws_123/2024/01/uuid-myfile.jpg",
        "image/jpeg"
      );

      expect(result.success).toBe(true);
      // Should be: ws_123/2024/01/thumbnails/thumb-uuid-myfile.webp
      expect(result.thumbnailKey).toBe("ws_123/2024/01/thumbnails/thumb-uuid-myfile.webp");
    });
  });

  describe("generateThumbnailsBatch", () => {
    it("should process multiple files", async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .jpeg()
        .toBuffer();

      mockGetPresignedDownloadUrl.mockResolvedValue("https://storage.example.com/image.jpg");
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(testImageBuffer.buffer),
      });
      mockUploadFile.mockResolvedValue({ key: "thumbnail-key" });
      mockUpdateThumbnailKey.mockResolvedValue({ id: "file" });

      const files = [
        { id: "file_1", storageKey: "ws/2024/01/image1.jpg", mimeType: "image/jpeg" },
        { id: "file_2", storageKey: "ws/2024/01/image2.png", mimeType: "image/png" },
        { id: "file_3", storageKey: "ws/2024/01/doc.txt", mimeType: "text/plain" },
      ];

      const results = await thumbnailService.generateThumbnailsBatch(files);

      expect(results.size).toBe(3);
      expect(results.get("file_1")?.success).toBe(true);
      expect(results.get("file_2")?.success).toBe(true);
      expect(results.get("file_3")?.success).toBe(false); // text/plain not supported
    });
  });
});
