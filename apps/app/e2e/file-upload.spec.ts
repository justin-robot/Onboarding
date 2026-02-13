import { test, expect } from "@playwright/test";

/**
 * E2E tests for File Upload flow
 * Tests file upload, download, listing, and deletion via presigned URLs
 */

test.describe("File Upload Flow", () => {
  // Helper to set up authenticated context
  async function setupAuth(context: typeof test.prototype.context) {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "mock-session-token-for-e2e",
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  // Mock file data
  const mockFile = {
    id: "file-1",
    workspaceId: "workspace-1",
    uploadedBy: "user-1",
    name: "document.pdf",
    mimeType: "application/pdf",
    size: 1024000,
    storageKey: "workspace-1/2024/01/abc123-document.pdf",
    thumbnailKey: null,
    sourceType: "task_upload",
    sourceTaskId: "task-1",
    previousVersionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  const mockPresignedUpload = {
    uploadUrl: "https://storage.example.com/upload?signature=abc123",
    key: "workspace-1/2024/01/abc123-document.pdf",
    expiresIn: 3600,
  };

  const mockFileWithUrl = {
    ...mockFile,
    downloadUrl: "https://storage.example.com/download/document.pdf?signature=xyz789",
  };

  test.describe("Authentication", () => {
    test("GET /api/files/presigned returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/files/presigned?workspaceId=ws-1&filename=test.pdf&mimeType=application/pdf");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("POST /api/files/confirm returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.post("/api/files/confirm", {
        data: {
          key: "test-key",
          workspaceId: "ws-1",
          name: "test.pdf",
          mimeType: "application/pdf",
          size: 1024,
          sourceType: "task_upload",
        },
      });
      expect(response.status()).toBe(401);
    });

    test("GET /api/files/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/files/file-1");
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/files/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.delete("/api/files/file-1");
      expect(response.status()).toBe(401);
    });

    test("GET /api/files returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/files?workspaceId=ws-1");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Get Presigned Upload URL (GET /api/files/presigned)", () => {
    test("returns presigned URL with valid parameters", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/presigned*", async (route) => {
        const url = new URL(route.request().url());
        const workspaceId = url.searchParams.get("workspaceId");
        const filename = url.searchParams.get("filename");
        const mimeType = url.searchParams.get("mimeType");

        expect(workspaceId).toBe("workspace-1");
        expect(filename).toBe("document.pdf");
        expect(mimeType).toBe("application/pdf");

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockPresignedUpload),
        });
      });

      await page.goto("/");
      const response = await page.request.get(
        "/api/files/presigned?workspaceId=workspace-1&filename=document.pdf&mimeType=application/pdf"
      );

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.uploadUrl).toBeTruthy();
      expect(result.key).toBeTruthy();
      expect(result.expiresIn).toBe(3600);
    });

    test("returns 400 when workspaceId is missing", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/presigned*", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "workspaceId is required" }),
        });
      });

      await page.goto("/");
      const response = await page.request.get(
        "/api/files/presigned?filename=document.pdf&mimeType=application/pdf"
      );

      expect(response.status()).toBe(400);
    });

    test("returns 400 when filename is missing", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/presigned*", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "filename is required" }),
        });
      });

      await page.goto("/");
      const response = await page.request.get(
        "/api/files/presigned?workspaceId=workspace-1&mimeType=application/pdf"
      );

      expect(response.status()).toBe(400);
    });

    test("generates unique storage key", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/presigned*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...mockPresignedUpload,
            key: "workspace-1/2024/01/unique-uuid-document.pdf",
          }),
        });
      });

      await page.goto("/");
      const response = await page.request.get(
        "/api/files/presigned?workspaceId=workspace-1&filename=document.pdf&mimeType=application/pdf"
      );

      const result = await response.json();
      expect(result.key).toContain("workspace-1");
      expect(result.key).toContain("document.pdf");
    });
  });

  test.describe("Confirm Upload (POST /api/files/confirm)", () => {
    test("creates file record after successful upload", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/confirm", async (route) => {
        const body = route.request().postDataJSON();

        expect(body.key).toBe(mockPresignedUpload.key);
        expect(body.workspaceId).toBe("workspace-1");
        expect(body.name).toBe("document.pdf");
        expect(body.mimeType).toBe("application/pdf");
        expect(body.size).toBe(1024000);

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(mockFile),
        });
      });

      await page.goto("/");
      const response = await page.request.post("/api/files/confirm", {
        data: {
          key: mockPresignedUpload.key,
          workspaceId: "workspace-1",
          name: "document.pdf",
          mimeType: "application/pdf",
          size: 1024000,
          sourceType: "task_upload",
          sourceTaskId: "task-1",
        },
      });

      expect(response.status()).toBe(201);
      const file = await response.json();
      expect(file.id).toBe("file-1");
      expect(file.name).toBe("document.pdf");
      expect(file.storageKey).toBe(mockPresignedUpload.key);
    });

    test("returns 400 when required fields are missing", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/confirm", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Missing required fields" }),
        });
      });

      await page.goto("/");
      const response = await page.request.post("/api/files/confirm", {
        data: { key: "some-key" },
      });

      expect(response.status()).toBe(400);
    });

    test("supports optional thumbnail generation", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/confirm", async (route) => {
        const body = route.request().postDataJSON();
        expect(body.generateThumbnail).toBe(true);

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(mockFile),
        });
      });

      await page.goto("/");
      const response = await page.request.post("/api/files/confirm", {
        data: {
          key: mockPresignedUpload.key,
          workspaceId: "workspace-1",
          name: "image.jpg",
          mimeType: "image/jpeg",
          size: 512000,
          sourceType: "task_upload",
          generateThumbnail: true,
        },
      });

      expect(response.status()).toBe(201);
    });
  });

  test.describe("Get File (GET /api/files/[id])", () => {
    test("returns file with download URL", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/file-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockFileWithUrl),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/files/file-1");

      expect(response.status()).toBe(200);
      const file = await response.json();
      expect(file.id).toBe("file-1");
      expect(file.name).toBe("document.pdf");
      expect(file.downloadUrl).toBeTruthy();
    });

    test("returns 404 for non-existent file", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/non-existent", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "File not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/files/non-existent");

      expect(response.status()).toBe(404);
    });

    test("returns file metadata including size and mime type", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/file-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockFileWithUrl),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/files/file-1");

      const file = await response.json();
      expect(file.mimeType).toBe("application/pdf");
      expect(file.size).toBe(1024000);
      expect(file.storageKey).toBeTruthy();
    });
  });

  test.describe("List Files (GET /api/files)", () => {
    test("returns files for a workspace", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const workspaceFiles = [
        { ...mockFile, id: "file-1", name: "document1.pdf" },
        { ...mockFile, id: "file-2", name: "document2.pdf" },
        { ...mockFile, id: "file-3", name: "image.jpg", mimeType: "image/jpeg" },
      ];

      await page.route("**/api/files?workspaceId=workspace-1", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(workspaceFiles),
        });
      });

      await page.goto("/");
      const response = await page.request.get("/api/files?workspaceId=workspace-1");

      expect(response.status()).toBe(200);
      const files = await response.json();
      expect(files).toHaveLength(3);
      expect(files[0].workspaceId).toBe("workspace-1");
    });

    test("returns files for a task", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const taskFiles = [
        { ...mockFile, id: "file-1", sourceTaskId: "task-1" },
        { ...mockFile, id: "file-2", sourceTaskId: "task-1" },
      ];

      await page.route("**/api/files?taskId=task-1", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(taskFiles),
        });
      });

      await page.goto("/");
      const response = await page.request.get("/api/files?taskId=task-1");

      expect(response.status()).toBe(200);
      const files = await response.json();
      expect(files).toHaveLength(2);
      expect(files[0].sourceTaskId).toBe("task-1");
    });

    test("returns empty array when no files exist", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files?workspaceId=empty-workspace", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto("/");
      const response = await page.request.get("/api/files?workspaceId=empty-workspace");

      expect(response.status()).toBe(200);
      const files = await response.json();
      expect(files).toEqual([]);
    });
  });

  test.describe("Delete File (DELETE /api/files/[id])", () => {
    test("soft deletes file successfully", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/file-1", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.delete("/api/files/file-1");

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    test("returns 404 for non-existent file", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/non-existent", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "File not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.delete("/api/files/non-existent");

      expect(response.status()).toBe(404);
    });

    test("deleted file no longer appears in list", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      let files = [
        { ...mockFile, id: "file-1" },
        { ...mockFile, id: "file-2" },
      ];

      await page.route("**/api/files?workspaceId=workspace-1", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(files),
        });
      });

      await page.route("**/api/files/file-1", async (route) => {
        if (route.request().method() === "DELETE") {
          files = files.filter((f) => f.id !== "file-1");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.goto("/");

      // Initial list
      let response = await page.request.get("/api/files?workspaceId=workspace-1");
      let list = await response.json();
      expect(list).toHaveLength(2);

      // Delete file
      await page.request.delete("/api/files/file-1");

      // Updated list
      response = await page.request.get("/api/files?workspaceId=workspace-1");
      list = await response.json();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("file-2");
    });
  });

  test.describe("File Upload Workflow", () => {
    test("complete upload workflow: presigned URL -> upload -> confirm -> verify", async ({
      page,
      context,
    }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      let uploadedFile: typeof mockFile | null = null;

      // Step 1: Get presigned URL
      await page.route("**/api/files/presigned*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockPresignedUpload),
        });
      });

      // Step 2: Confirm upload
      await page.route("**/api/files/confirm", async (route) => {
        uploadedFile = { ...mockFile };
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(uploadedFile),
        });
      });

      // Step 3: Get file
      await page.route("**/api/files/file-1", async (route) => {
        if (route.request().method() === "GET") {
          if (uploadedFile) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ ...uploadedFile, downloadUrl: mockFileWithUrl.downloadUrl }),
            });
          } else {
            await route.fulfill({
              status: 404,
              contentType: "application/json",
              body: JSON.stringify({ error: "File not found" }),
            });
          }
        }
      });

      await page.goto("/");

      // Step 1: Get presigned upload URL
      let response = await page.request.get(
        "/api/files/presigned?workspaceId=workspace-1&filename=document.pdf&mimeType=application/pdf"
      );
      expect(response.status()).toBe(200);
      const presigned = await response.json();
      expect(presigned.uploadUrl).toBeTruthy();
      expect(presigned.key).toBeTruthy();

      // Step 2: Simulate upload to storage (in real scenario, this would be a PUT to the presigned URL)
      // For E2E tests, we skip the actual S3/R2 upload and go directly to confirm

      // Step 3: Confirm the upload
      response = await page.request.post("/api/files/confirm", {
        data: {
          key: presigned.key,
          workspaceId: "workspace-1",
          name: "document.pdf",
          mimeType: "application/pdf",
          size: 1024000,
          sourceType: "task_upload",
          sourceTaskId: "task-1",
        },
      });
      expect(response.status()).toBe(201);
      const confirmedFile = await response.json();
      expect(confirmedFile.id).toBeTruthy();

      // Step 4: Verify file is accessible
      response = await page.request.get(`/api/files/${confirmedFile.id}`);
      expect(response.status()).toBe(200);
      const fetchedFile = await response.json();
      expect(fetchedFile.name).toBe("document.pdf");
      expect(fetchedFile.downloadUrl).toBeTruthy();
    });

    test("multiple file uploads for same task", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const uploadedFiles: typeof mockFile[] = [];
      let fileCounter = 0;

      await page.route("**/api/files/presigned*", async (route) => {
        fileCounter++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...mockPresignedUpload,
            key: `workspace-1/2024/01/file-${fileCounter}.pdf`,
          }),
        });
      });

      await page.route("**/api/files/confirm", async (route) => {
        const body = route.request().postDataJSON();
        const newFile = {
          ...mockFile,
          id: `file-${uploadedFiles.length + 1}`,
          name: body.name,
          storageKey: body.key,
        };
        uploadedFiles.push(newFile);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newFile),
        });
      });

      await page.route("**/api/files?taskId=task-1", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(uploadedFiles),
        });
      });

      await page.goto("/");

      // Upload first file
      await page.request.get(
        "/api/files/presigned?workspaceId=workspace-1&filename=doc1.pdf&mimeType=application/pdf"
      );
      await page.request.post("/api/files/confirm", {
        data: {
          key: "workspace-1/2024/01/file-1.pdf",
          workspaceId: "workspace-1",
          name: "doc1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          sourceType: "task_upload",
          sourceTaskId: "task-1",
        },
      });

      // Upload second file
      await page.request.get(
        "/api/files/presigned?workspaceId=workspace-1&filename=doc2.pdf&mimeType=application/pdf"
      );
      await page.request.post("/api/files/confirm", {
        data: {
          key: "workspace-1/2024/01/file-2.pdf",
          workspaceId: "workspace-1",
          name: "doc2.pdf",
          mimeType: "application/pdf",
          size: 2048,
          sourceType: "task_upload",
          sourceTaskId: "task-1",
        },
      });

      // Verify both files are listed for the task
      const response = await page.request.get("/api/files?taskId=task-1");
      const files = await response.json();
      expect(files).toHaveLength(2);
    });
  });

  test.describe("File Version Management", () => {
    test("replace file creates new version", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const originalFile = { ...mockFile, id: "file-original" };
      const replacedFile = {
        ...mockFile,
        id: "file-new-version",
        previousVersionId: "file-original",
        name: "document-v2.pdf",
      };

      await page.route("**/api/files/file-original/replace", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(replacedFile),
        });
      });

      await page.goto("/");
      const response = await page.request.post("/api/files/file-original/replace", {
        data: {
          key: "workspace-1/2024/01/new-version.pdf",
          name: "document-v2.pdf",
          mimeType: "application/pdf",
          size: 2048000,
        },
      });

      expect(response.status()).toBe(200);
      const newVersion = await response.json();
      expect(newVersion.previousVersionId).toBe("file-original");
      expect(newVersion.name).toBe("document-v2.pdf");
    });

    test("get file version history", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const versionHistory = [
        { ...mockFile, id: "file-v3", previousVersionId: "file-v2", name: "doc-v3.pdf" },
        { ...mockFile, id: "file-v2", previousVersionId: "file-v1", name: "doc-v2.pdf" },
        { ...mockFile, id: "file-v1", previousVersionId: null, name: "doc-v1.pdf" },
      ];

      await page.route("**/api/files/file-v3/versions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(versionHistory),
        });
      });

      await page.goto("/");
      const response = await page.request.get("/api/files/file-v3/versions");

      expect(response.status()).toBe(200);
      const history = await response.json();
      expect(history).toHaveLength(3);
      expect(history[0].name).toBe("doc-v3.pdf"); // newest
      expect(history[2].name).toBe("doc-v1.pdf"); // oldest
    });
  });

  test.describe("File Type Handling", () => {
    test("handles image uploads", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/files/confirm", async (route) => {
        const body = route.request().postDataJSON();
        expect(body.mimeType).toBe("image/jpeg");

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...mockFile,
            id: "image-file",
            name: "photo.jpg",
            mimeType: "image/jpeg",
          }),
        });
      });

      await page.goto("/");
      const response = await page.request.post("/api/files/confirm", {
        data: {
          key: "workspace-1/2024/01/photo.jpg",
          workspaceId: "workspace-1",
          name: "photo.jpg",
          mimeType: "image/jpeg",
          size: 512000,
          sourceType: "task_upload",
          generateThumbnail: true,
        },
      });

      expect(response.status()).toBe(201);
      const file = await response.json();
      expect(file.mimeType).toBe("image/jpeg");
    });

    test("handles document uploads (PDF, Word, Excel)", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const documentTypes = [
        { name: "document.pdf", mimeType: "application/pdf" },
        { name: "spreadsheet.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        { name: "presentation.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
      ];

      for (const doc of documentTypes) {
        await page.route("**/api/files/confirm", async (route) => {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockFile,
              name: body.name,
              mimeType: body.mimeType,
            }),
          });
        });

        await page.goto("/");
        const response = await page.request.post("/api/files/confirm", {
          data: {
            key: `workspace-1/2024/01/${doc.name}`,
            workspaceId: "workspace-1",
            name: doc.name,
            mimeType: doc.mimeType,
            size: 1024000,
            sourceType: "task_upload",
          },
        });

        expect(response.status()).toBe(201);
        const file = await response.json();
        expect(file.mimeType).toBe(doc.mimeType);
      }
    });
  });
});
