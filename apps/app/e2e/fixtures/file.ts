import { test as base, expect, Page, BrowserContext } from "@playwright/test";

/**
 * File source types
 */
export type FileSourceType = "task_upload" | "form_attachment" | "chat_attachment";

/**
 * Mock file data interface
 */
export interface MockFile {
  id: string;
  workspaceId: string;
  uploadedBy: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  thumbnailKey: string | null;
  sourceType: FileSourceType;
  sourceTaskId: string | null;
  previousVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  downloadUrl?: string;
}

/**
 * Presigned upload URL response
 */
export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Confirm upload options
 */
export interface ConfirmUploadOptions {
  key: string;
  workspaceId: string;
  name: string;
  mimeType: string;
  size: number;
  sourceType: FileSourceType;
  sourceTaskId?: string;
  generateThumbnail?: boolean;
}

/**
 * Test files for E2E tests
 */
export const testFiles: MockFile[] = [
  {
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
  },
  {
    id: "file-2",
    workspaceId: "workspace-1",
    uploadedBy: "user-1",
    name: "photo.jpg",
    mimeType: "image/jpeg",
    size: 512000,
    storageKey: "workspace-1/2024/01/def456-photo.jpg",
    thumbnailKey: "workspace-1/2024/01/def456-photo-thumb.jpg",
    sourceType: "task_upload",
    sourceTaskId: "task-1",
    previousVersionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  },
  {
    id: "file-3",
    workspaceId: "workspace-1",
    uploadedBy: "user-1",
    name: "spreadsheet.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 256000,
    storageKey: "workspace-1/2024/01/ghi789-spreadsheet.xlsx",
    thumbnailKey: null,
    sourceType: "form_attachment",
    sourceTaskId: "task-2",
    previousVersionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  },
];

/**
 * Common MIME types for testing
 */
export const mimeTypes = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
};

/**
 * Mock user for authenticated file tests
 */
export const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  emailVerified: true,
};

/**
 * Helper to set up authentication for file tests
 */
export async function setupFileAuth(
  context: BrowserContext,
  page: Page
): Promise<void> {
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "mock-session-token-for-file-e2e",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: mockUser }),
    });
  });
}

/**
 * Helper to mock file API endpoints
 */
export async function mockFileEndpoints(
  page: Page,
  files: MockFile[] = testFiles
): Promise<void> {
  const fileMap = new Map(files.map((f) => [f.id, { ...f }]));
  let keyCounter = 0;

  // GET /api/files/presigned
  await page.route("**/api/files/presigned*", async (route) => {
    const url = new URL(route.request().url());
    const workspaceId = url.searchParams.get("workspaceId");
    const filename = url.searchParams.get("filename");

    if (!workspaceId || !filename) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Missing required parameters" }),
      });
      return;
    }

    keyCounter++;
    const key = `${workspaceId}/2024/01/uuid${keyCounter}-${filename.toLowerCase().replace(/[^a-z0-9.-]/g, "_")}`;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploadUrl: `https://storage.example.com/upload?key=${encodeURIComponent(key)}&signature=mock`,
        key,
        expiresIn: 3600,
      }),
    });
  });

  // POST /api/files/confirm
  await page.route("**/api/files/confirm", async (route) => {
    const body = route.request().postDataJSON();

    if (!body.key || !body.workspaceId || !body.name || !body.mimeType || body.size === undefined) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Missing required fields" }),
      });
      return;
    }

    const newFile: MockFile = {
      id: `file-${Date.now()}`,
      workspaceId: body.workspaceId,
      uploadedBy: mockUser.id,
      name: body.name,
      mimeType: body.mimeType,
      size: body.size,
      storageKey: body.key,
      thumbnailKey: null,
      sourceType: body.sourceType || "task_upload",
      sourceTaskId: body.sourceTaskId || null,
      previousVersionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    fileMap.set(newFile.id, newFile);

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(newFile),
    });
  });

  // GET /api/files (list)
  await page.route(/\/api\/files\?/, async (route) => {
    const url = new URL(route.request().url());
    const workspaceId = url.searchParams.get("workspaceId");
    const taskId = url.searchParams.get("taskId");

    let filteredFiles = Array.from(fileMap.values()).filter((f) => !f.deletedAt);

    if (workspaceId) {
      filteredFiles = filteredFiles.filter((f) => f.workspaceId === workspaceId);
    }

    if (taskId) {
      filteredFiles = filteredFiles.filter((f) => f.sourceTaskId === taskId);
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(filteredFiles),
    });
  });

  // GET/DELETE /api/files/[id]
  await page.route(/\/api\/files\/[^/?]+$/, async (route) => {
    const url = route.request().url();
    const fileId = url.split("/").pop()!;
    const method = route.request().method();
    const file = fileMap.get(fileId);

    if (method === "GET") {
      if (file && !file.deletedAt) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...file,
            downloadUrl: `https://storage.example.com/download/${file.storageKey}?signature=mock`,
          }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "File not found" }),
        });
      }
    } else if (method === "DELETE") {
      if (file && !file.deletedAt) {
        file.deletedAt = new Date().toISOString();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
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
}

/**
 * Helper to get presigned upload URL
 */
export async function getPresignedUploadUrl(
  page: Page,
  workspaceId: string,
  filename: string,
  mimeType: string
): Promise<PresignedUploadResult> {
  const response = await page.request.get(
    `/api/files/presigned?workspaceId=${encodeURIComponent(workspaceId)}&filename=${encodeURIComponent(filename)}&mimeType=${encodeURIComponent(mimeType)}`
  );
  return response.json();
}

/**
 * Helper to confirm file upload
 */
export async function confirmUpload(
  page: Page,
  options: ConfirmUploadOptions
): Promise<MockFile> {
  const response = await page.request.post("/api/files/confirm", {
    data: options,
  });
  return response.json();
}

/**
 * Helper to get file by ID
 */
export async function getFile(page: Page, fileId: string): Promise<MockFile> {
  const response = await page.request.get(`/api/files/${fileId}`);
  return response.json();
}

/**
 * Helper to delete file
 */
export async function deleteFile(
  page: Page,
  fileId: string
): Promise<{ success: boolean }> {
  const response = await page.request.delete(`/api/files/${fileId}`);
  return response.json();
}

/**
 * Helper to list files
 */
export async function listFiles(
  page: Page,
  params: { workspaceId?: string; taskId?: string }
): Promise<MockFile[]> {
  const searchParams = new URLSearchParams();
  if (params.workspaceId) searchParams.set("workspaceId", params.workspaceId);
  if (params.taskId) searchParams.set("taskId", params.taskId);

  const response = await page.request.get(`/api/files?${searchParams.toString()}`);
  return response.json();
}

/**
 * Helper to simulate complete upload flow
 */
export async function uploadFile(
  page: Page,
  workspaceId: string,
  filename: string,
  mimeType: string,
  size: number,
  options?: {
    sourceType?: FileSourceType;
    sourceTaskId?: string;
    generateThumbnail?: boolean;
  }
): Promise<MockFile> {
  // Get presigned URL
  const presigned = await getPresignedUploadUrl(page, workspaceId, filename, mimeType);

  // Confirm upload (simulating that client uploaded to presigned URL)
  return confirmUpload(page, {
    key: presigned.key,
    workspaceId,
    name: filename,
    mimeType,
    size,
    sourceType: options?.sourceType || "task_upload",
    sourceTaskId: options?.sourceTaskId,
    generateThumbnail: options?.generateThumbnail,
  });
}

/**
 * Extended test fixture with file helpers
 */
export const test = base.extend<{
  authenticatedFilePage: Page;
}>({
  authenticatedFilePage: async ({ page, context }, use) => {
    await setupFileAuth(context, page);
    await use(page);
  },
});

export { expect };
