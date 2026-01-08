import { describe, it, expect } from "vitest";
import { waitFor, sleep, createMockFn } from "../index";

describe("@repo/vitest utilities", () => {
  describe("waitFor", () => {
    it("should wait for condition to be true", async () => {
      let value = false;
      setTimeout(() => {
        value = true;
      }, 100);

      await waitFor(() => value);
      expect(value).toBe(true);
    });

    it("should timeout if condition is never true", async () => {
      await expect(
        waitFor(() => false, { timeout: 100 })
      ).rejects.toThrow("waitFor timed out after 100ms");
    });
  });

  describe("sleep", () => {
    it("should wait for specified duration", async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(95); // Allow small variance
    });
  });

  describe("createMockFn", () => {
    it("should track function calls", () => {
      const mockFn = createMockFn<(x: number, y: string) => void>();
      
      mockFn(1, "a");
      mockFn(2, "b");

      expect(mockFn.calls).toHaveLength(2);
      expect(mockFn.calls[0]).toEqual([1, "a"]);
      expect(mockFn.calls[1]).toEqual([2, "b"]);
    });
  });
});

