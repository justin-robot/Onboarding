import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFormDraft } from "../components/form-builder";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useFormDraft", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should load draft on mount", async () => {
    const mockDraft = {
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "draft",
      values: { el_1: "test value" },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDraft),
    });

    const { result } = renderHook(() =>
      useFormDraft({ formConfigId: "form_1" })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.values).toEqual({ el_1: "test value" });
    expect(result.current.status).toBe("idle");
    expect(mockFetch).toHaveBeenCalledWith("/api/submissions/form_1/draft");
  });

  it("should handle empty draft", async () => {
    const mockDraft = {
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "draft",
      values: {},
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDraft),
    });

    const { result } = renderHook(() =>
      useFormDraft({ formConfigId: "form_1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.values).toEqual({});
    expect(result.current.status).toBe("idle");
  });

  it("should handle load error", async () => {
    const onError = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() =>
      useFormDraft({ formConfigId: "form_1", onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.status).toBe("error");
    expect(onError).toHaveBeenCalled();
  });

  it("should update values immediately", async () => {
    const mockDraft = {
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "draft",
      values: { el_1: "initial" },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDraft),
    });

    const { result } = renderHook(() =>
      useFormDraft({ formConfigId: "form_1", debounceMs: 500 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateValues({ el_1: "updated" });
    });

    // Values should update immediately
    expect(result.current.values.el_1).toBe("updated");
  });

  it("should merge values on update", async () => {
    const mockDraft = {
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "draft",
      values: { el_1: "value1", el_2: "value2" },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDraft),
    });

    const { result } = renderHook(() =>
      useFormDraft({ formConfigId: "form_1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateValues({ el_1: "updated" });
    });

    // el_2 should still be present
    expect(result.current.values).toEqual({ el_1: "updated", el_2: "value2" });
  });

  it("should show submitted status for already submitted forms", async () => {
    const mockDraft = {
      id: "sub_1",
      formConfigId: "form_1",
      userId: "user_1",
      status: "submitted",
      values: { el_1: "value" },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDraft),
    });

    const { result } = renderHook(() =>
      useFormDraft({ formConfigId: "form_1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("submitted");
  });
});
