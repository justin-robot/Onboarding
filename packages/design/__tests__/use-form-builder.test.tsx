import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFormBuilder } from "../components/form-builder";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useFormBuilder", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should load form config on mount", async () => {
    const mockConfig = {
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
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });

    const { result } = renderHook(() =>
      useFormBuilder({ taskId: "task_1" })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toEqual(mockConfig);
    expect(mockFetch).toHaveBeenCalledWith("/api/forms/task_1");
  });

  it("should create empty config when no form exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: null, taskId: "task_1", pages: [] }),
    });

    const { result } = renderHook(() =>
      useFormBuilder({ taskId: "task_1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).not.toBeNull();
    expect(result.current.config?.taskId).toBe("task_1");
    expect(result.current.config?.pages).toHaveLength(1);
    expect(result.current.config?.pages[0].title).toBe("Page 1");
  });

  it("should handle load error gracefully", async () => {
    const onError = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() =>
      useFormBuilder({ taskId: "task_1", onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(onError).toHaveBeenCalled();
    // Should still have empty config for user to work with
    expect(result.current.config).not.toBeNull();
  });

  it("should update config immediately when updateConfig is called", async () => {
    const mockConfig = {
      id: "form_1",
      taskId: "task_1",
      pages: [{ id: "page_1", title: "Page 1", position: 0, elements: [] }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });

    const { result } = renderHook(() =>
      useFormBuilder({ taskId: "task_1", debounceMs: 500 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedConfig = {
      ...mockConfig,
      pages: [{ ...mockConfig.pages[0], title: "Updated Page" }],
    };

    act(() => {
      result.current.updateConfig(updatedConfig);
    });

    // Config should update immediately (even though save is debounced)
    expect(result.current.config?.pages[0].title).toBe("Updated Page");
  });

  it("should have correct initial save status", async () => {
    const mockConfig = {
      id: "form_1",
      taskId: "task_1",
      pages: [{ id: "page_1", title: "Page 1", position: 0, elements: [] }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });

    const { result } = renderHook(() =>
      useFormBuilder({ taskId: "task_1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.saveStatus).toBe("idle");
  });

  it("should expose error state", async () => {
    const onError = vi.fn();
    const mockError = new Error("Network error");
    mockFetch.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() =>
      useFormBuilder({ taskId: "task_1", onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.saveStatus).toBe("idle"); // Error during load, not save
  });
});
