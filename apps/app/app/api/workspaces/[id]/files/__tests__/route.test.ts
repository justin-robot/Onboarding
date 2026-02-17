import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/services", () => ({
  fileService: {
    getPresignedUploadUrl: vi.fn(),
    confirmUpload: vi.fn(),
    getByWorkspaceId: vi.fn(),
    getByIdWithUrl: vi.fn(),
    delete: vi.fn(),
  },
  workspaceService: {
    getById: vi.fn(),
  },
  memberService: {
    isMember: vi.fn(),
  },
}));

vi.mock("../../../../_lib/api-utils", () => ({
  requireAuth: vi.fn(),
  json: vi.fn((data: unknown) => new Response(JSON.stringify(data), { status: 200 })),
  errorResponse: vi.fn((message: string, status: number) =>
    new Response(JSON.stringify({ error: message }), { status })
  ),
  withErrorHandler: vi.fn((fn: () => unknown) => fn()),
}));

import { fileService, workspaceService, memberService } from "@/lib/services";
import { requireAuth } from "../../../../_lib/api-utils";

describe("Workspace Files API", () => {
  const mockUser = { id: "user-1", email: "test@example.com" };
  const mockWorkspace = { id: "ws-1", name: "Test Workspace" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(workspaceService.getById).mockResolvedValue(mockWorkspace);
    vi.mocked(memberService.isMember).mockResolvedValue(true);
  });

  describe("GET /api/workspaces/[id]/files", () => {
    it("should return files for a workspace", async () => {
      const mockFiles = [
        { id: "file-1", name: "document.pdf", mimeType: "application/pdf", size: 1000 },
        { id: "file-2", name: "image.jpg", mimeType: "image/jpeg", size: 2000 },
      ];
      vi.mocked(fileService.getByWorkspaceId).mockResolvedValue(mockFiles);

      // Import and call the GET handler
      const { GET } = await import("../route");
      const request = new Request("http://localhost/api/workspaces/ws-1/files");
      const response = await GET(request as NextRequest, { params: Promise.resolve({ id: "ws-1" }) });
      const data = await response.json();

      expect(data.files).toHaveLength(2);
      expect(data.files[0].name).toBe("document.pdf");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const { GET } = await import("../route");
      const request = new Request("http://localhost/api/workspaces/ws-1/files");

      await expect(GET(request as NextRequest, { params: Promise.resolve({ id: "ws-1" }) }))
        .rejects.toThrow("Unauthorized");
    });

    it("should return 403 if not a workspace member", async () => {
      vi.mocked(memberService.isMember).mockResolvedValue(false);

      const { GET } = await import("../route");
      const request = new Request("http://localhost/api/workspaces/ws-1/files");
      const response = await GET(request as NextRequest, { params: Promise.resolve({ id: "ws-1" }) });

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/workspaces/[id]/files/upload", () => {
    it("should return presigned URL for file upload", async () => {
      vi.mocked(fileService.getPresignedUploadUrl).mockResolvedValue({
        uploadUrl: "https://s3.example.com/upload?signed=true",
        key: "ws-1/2024/01/uuid-document.pdf",
        expiresIn: 3600,
      });

      const { POST } = await import("../upload/route");
      const request = new Request("http://localhost/api/workspaces/ws-1/files/upload", {
        method: "POST",
        body: JSON.stringify({
          filename: "document.pdf",
          mimeType: "application/pdf",
        }),
      });

      const response = await POST(request as NextRequest, { params: Promise.resolve({ id: "ws-1" }) });
      const data = await response.json();

      expect(data.uploadUrl).toContain("https://");
      expect(data.key).toContain("ws-1");
    });

    it("should return 400 if filename is missing", async () => {
      const { POST } = await import("../upload/route");
      const request = new Request("http://localhost/api/workspaces/ws-1/files/upload", {
        method: "POST",
        body: JSON.stringify({ mimeType: "application/pdf" }),
      });

      const response = await POST(request as NextRequest, { params: Promise.resolve({ id: "ws-1" }) });
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/workspaces/[id]/files/confirm", () => {
    it("should confirm upload and create file record", async () => {
      const mockFile = {
        id: "file-1",
        workspaceId: "ws-1",
        name: "document.pdf",
        mimeType: "application/pdf",
        size: 1000,
        storageKey: "ws-1/2024/01/uuid-document.pdf",
        createdAt: new Date(),
      };
      vi.mocked(fileService.confirmUpload).mockResolvedValue(mockFile);

      const { POST } = await import("../confirm/route");
      const request = new Request("http://localhost/api/workspaces/ws-1/files/confirm", {
        method: "POST",
        body: JSON.stringify({
          key: "ws-1/2024/01/uuid-document.pdf",
          name: "document.pdf",
          mimeType: "application/pdf",
          size: 1000,
        }),
      });

      const response = await POST(request as NextRequest, { params: Promise.resolve({ id: "ws-1" }) });
      const data = await response.json();

      expect(data.id).toBe("file-1");
      expect(data.name).toBe("document.pdf");
    });

    it("should return 400 if required fields are missing", async () => {
      const { POST } = await import("../confirm/route");
      const request = new Request("http://localhost/api/workspaces/ws-1/files/confirm", {
        method: "POST",
        body: JSON.stringify({ key: "some-key" }), // Missing name, mimeType, size
      });

      const response = await POST(request as NextRequest, { params: Promise.resolve({ id: "ws-1" }) });
      expect(response.status).toBe(400);
    });
  });
});
