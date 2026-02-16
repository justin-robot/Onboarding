import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../submit/route";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@repo/auth/server", () => ({
  currentUser: vi.fn(() =>
    Promise.resolve({ id: "user_1", email: "test@example.com" })
  ),
}));

// Mock database services
const mockGetFormWithPagesAndElements = vi.fn();
const mockGetDraft = vi.fn();
const mockSaveResponses = vi.fn();
const mockSubmit = vi.fn();
const mockCompleteTaskForUser = vi.fn();

vi.mock("@repo/database", () => ({
  formService: {
    getFormWithPagesAndElements: (...args: unknown[]) =>
      mockGetFormWithPagesAndElements(...args),
  },
  submissionService: {
    getDraft: (...args: unknown[]) => mockGetDraft(...args),
    saveResponses: (...args: unknown[]) => mockSaveResponses(...args),
    submit: (...args: unknown[]) => mockSubmit(...args),
  },
  completionService: {
    completeTaskForUser: (...args: unknown[]) => mockCompleteTaskForUser(...args),
  },
}));

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/submissions/form_1/submit", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/submissions/[formConfigId]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject submission when form config not found", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue(null);

    const request = createRequest({ values: { field1: "test" } });
    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain("Form config not found");
  });

  it("should validate required fields", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [
            {
              id: "el_1",
              type: "text",
              label: "Name",
              required: true,
              position: 0,
            },
          ],
        },
      ],
    });

    const request = createRequest({ values: {} });
    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
    expect(data.errors).toBeDefined();
    expect(data.errors.el_1).toBeDefined();
  });

  it("should validate email format", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [
            {
              id: "email",
              type: "email",
              label: "Email",
              required: true,
              position: 0,
            },
          ],
        },
      ],
    });

    const request = createRequest({ values: { email: "not-an-email" } });
    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
    expect(data.errors.email).toBeDefined();
  });

  it("should validate select options", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [
            {
              id: "choice",
              type: "select",
              label: "Choice",
              required: true,
              options: [
                { label: "A", value: "a" },
                { label: "B", value: "b" },
              ],
              position: 0,
            },
          ],
        },
      ],
    });

    const request = createRequest({ values: { choice: "invalid" } });
    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
  });

  it("should validate number min/max", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [
            {
              id: "age",
              type: "number",
              label: "Age",
              required: true,
              validation: { min: 18, max: 120 },
              position: 0,
            },
          ],
        },
      ],
    });

    const request = createRequest({ values: { age: 15 } });
    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
    expect(data.errors.age).toBeDefined();
  });

  it("should accept valid submission and create records", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [
            {
              id: "name",
              type: "text",
              label: "Name",
              required: true,
              position: 0,
            },
            {
              id: "email",
              type: "email",
              label: "Email",
              required: true,
              position: 1,
            },
          ],
        },
      ],
    });

    mockGetDraft.mockResolvedValue({
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "draft",
    });

    mockSaveResponses.mockResolvedValue([]);
    mockSubmit.mockResolvedValue({
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "submitted",
      submittedAt: new Date(),
    });
    mockCompleteTaskForUser.mockResolvedValue({ success: true, taskCompleted: true });

    const request = createRequest({
      values: {
        name: "John Doe",
        email: "john@example.com",
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("submitted");
    expect(mockSaveResponses).toHaveBeenCalledWith("sub_1", {
      name: "John Doe",
      email: "john@example.com",
    });
    expect(mockSubmit).toHaveBeenCalledWith("sub_1");
  });

  it("should trigger task completion after successful submission", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [
            {
              id: "field1",
              type: "text",
              label: "Field",
              required: false,
              position: 0,
            },
          ],
        },
      ],
    });

    mockGetDraft.mockResolvedValue({
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "draft",
    });

    mockSaveResponses.mockResolvedValue([]);
    mockSubmit.mockResolvedValue({
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "submitted",
      submittedAt: new Date(),
    });
    mockCompleteTaskForUser.mockResolvedValue({ success: true, taskCompleted: true });

    const request = createRequest({
      values: { field1: "test" },
    });

    await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(mockCompleteTaskForUser).toHaveBeenCalledWith("task_1", "user_1");
  });

  it("should create draft if none exists", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [],
        },
      ],
    });

    // No existing draft
    mockGetDraft.mockResolvedValue(null);

    // Mock getOrCreateDraft
    const mockGetOrCreateDraft = vi.fn().mockResolvedValue({
      id: "sub_new",
      formConfigId: "form_1",
      userId: "user_1",
      status: "draft",
    });

    vi.doMock("@repo/database", async () => {
      const actual = await vi.importActual("@repo/database");
      return {
        ...actual,
        submissionService: {
          getDraft: mockGetDraft,
          getOrCreateDraft: mockGetOrCreateDraft,
          saveResponses: mockSaveResponses,
          submit: mockSubmit,
        },
      };
    });

    mockSaveResponses.mockResolvedValue([]);
    mockSubmit.mockResolvedValue({
      id: "sub_new",
      formConfigId: "form_1",
      userId: "user_1",
      status: "submitted",
      submittedAt: new Date(),
    });
    mockCompleteTaskForUser.mockResolvedValue({ success: true, taskCompleted: true });

    const request = createRequest({ values: {} });

    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    // Should succeed even with empty form
    expect(response.status).toBe(200);
  });

  it("should validate across multiple pages", async () => {
    mockGetFormWithPagesAndElements.mockResolvedValue({
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Personal Info",
          position: 0,
          elements: [
            {
              id: "name",
              type: "text",
              label: "Name",
              required: true,
              position: 0,
            },
          ],
        },
        {
          id: "page_2",
          title: "Contact Info",
          position: 1,
          elements: [
            {
              id: "phone",
              type: "phone",
              label: "Phone",
              required: true,
              position: 0,
            },
          ],
        },
      ],
    });

    // Missing required field from page 2
    const request = createRequest({
      values: { name: "John" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ formConfigId: "form_1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errors.phone).toBeDefined();
  });
});
