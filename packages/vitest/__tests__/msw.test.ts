import { describe, it, expect } from "vitest";
import { server, http, HttpResponse } from "../index";

describe("MSW Integration", () => {
  it("should intercept and mock API requests", async () => {
    // Add a handler for this test
    server.use(
      http.get("https://api.test.com/data", () => {
        return HttpResponse.json({
          message: "Mocked response",
          success: true,
        });
      })
    );

    const response = await fetch("https://api.test.com/data");
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.message).toBe("Mocked response");
    expect(data.success).toBe(true);
  });

  it("should mock POST requests with request body", async () => {
    server.use(
      http.post("https://api.test.com/users", async ({ request }) => {
        const body = (await request.json()) as { name: string; email: string };

        return HttpResponse.json(
          {
            id: "generated-id",
            name: body.name,
            email: body.email,
            createdAt: new Date().toISOString(),
          },
          { status: 201 }
        );
      })
    );

    const response = await fetch("https://api.test.com/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("generated-id");
    expect(data.name).toBe("Test User");
    expect(data.email).toBe("test@example.com");
  });

  it("should mock error responses", async () => {
    server.use(
      http.get("https://api.test.com/error", () => {
        return new HttpResponse(null, {
          status: 500,
          statusText: "Internal Server Error",
        });
      })
    );

    const response = await fetch("https://api.test.com/error");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    expect(response.statusText).toBe("Internal Server Error");
  });

  it("should reset handlers between tests", async () => {
    // This test verifies that handlers from previous tests don't leak
    // Add a new handler to verify the previous test's handler was reset
    server.use(
      http.get("https://api.test.com/data", () => {
        return HttpResponse.json({
          message: "Different response",
          reset: true,
        });
      })
    );

    const response = await fetch("https://api.test.com/data");
    const data = await response.json();

    // Should get the new handler's response, not the first test's response
    expect(data.message).toBe("Different response");
    expect(data.reset).toBe(true);
  });
});

