import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.describe("Sign In Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
    });

    test("displays sign in form", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });

    test("has link to sign up page", async ({ page }) => {
      const signUpLink = page.getByRole("link", { name: "Sign up" });
      await expect(signUpLink).toBeVisible();
      await signUpLink.click();
      await expect(page).toHaveURL("/sign-up");
    });

    test("has link to forgot password", async ({ page }) => {
      const forgotLink = page.getByRole("link", { name: "Forgot password?" });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();
      await expect(page).toHaveURL("/forgot-password");
    });

    test("shows validation error for invalid email", async ({ page }) => {
      await page.getByLabel("Email").fill("invalid-email");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByText("Invalid email address")).toBeVisible();
    });

    test("shows validation error for short password", async ({ page }) => {
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("short");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    });

    test("shows loading state during submission", async ({ page }) => {
      // Mock the auth endpoint to delay response
      await page.route("**/api/auth/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByRole("button", { name: "Signing in..." })).toBeVisible();
    });

    test("shows error for invalid credentials", async ({ page }) => {
      // Mock auth endpoint to return error
      await page.route("**/api/auth/sign-in/email", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Invalid credentials" }),
        });
      });

      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByRole("alert")).toBeVisible();
    });

    test("shows email verification required message", async ({ page }) => {
      // Mock auth endpoint to return 403 (email not verified)
      await page.route("**/api/auth/sign-in/email", async (route) => {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ message: "Email not verified" }),
        });
      });

      await page.getByLabel("Email").fill("unverified@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByText("Email verification required")).toBeVisible();
    });
  });

  test.describe("Sign Up Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-up");
    });

    test("displays sign up form", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
      await expect(page.getByLabel("Name")).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    });

    test("has link to sign in page", async ({ page }) => {
      const signInLink = page.getByRole("link", { name: "Sign in" });
      await expect(signInLink).toBeVisible();
      await signInLink.click();
      await expect(page).toHaveURL("/sign-in");
    });

    test("shows validation error for short name", async ({ page }) => {
      await page.getByLabel("Name").fill("A");
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByText("Name must be at least 2 characters")).toBeVisible();
    });

    test("shows validation error for invalid email", async ({ page }) => {
      await page.getByLabel("Name").fill("Test User");
      await page.getByLabel("Email").fill("invalid-email");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByText("Invalid email address")).toBeVisible();
    });

    test("shows validation error for short password", async ({ page }) => {
      await page.getByLabel("Name").fill("Test User");
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("short");
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    });

    test("shows loading state during submission", async ({ page }) => {
      // Mock the auth endpoint to delay response
      await page.route("**/api/auth/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.getByLabel("Name").fill("Test User");
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByRole("button", { name: "Creating account..." })).toBeVisible();
    });

    test("shows success message on successful signup", async ({ page }) => {
      // Mock successful signup
      await page.route("**/api/auth/sign-up/email", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { id: "123", email: "test@example.com" } }),
        });
      });

      await page.getByLabel("Name").fill("Test User");
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByText("Account created")).toBeVisible();
    });

    test("shows error for duplicate email", async ({ page }) => {
      // Mock auth endpoint to return error for duplicate email
      await page.route("**/api/auth/sign-up/email", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "User already exists" }),
        });
      });

      await page.getByLabel("Name").fill("Test User");
      await page.getByLabel("Email").fill("existing@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByRole("alert")).toBeVisible();
    });
  });

  test.describe("Protected Route Redirects", () => {
    test("redirects unauthenticated user to sign-in from /dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/);
      await expect(page.url()).toContain("callbackUrl=%2Fdashboard");
    });

    test("redirects unauthenticated user to sign-in from /workspace/123", async ({ page }) => {
      await page.goto("/workspace/123");

      await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/);
      await expect(page.url()).toContain("callbackUrl=%2Fworkspace%2F123");
    });

    test("allows access to public routes without authentication", async ({ page }) => {
      await page.goto("/sign-in");
      await expect(page).toHaveURL("/sign-in");

      await page.goto("/sign-up");
      await expect(page).toHaveURL("/sign-up");

      await page.goto("/forgot-password");
      await expect(page).toHaveURL("/forgot-password");
    });

    test("allows access to home page without authentication", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Session Persistence", () => {
    test("maintains session across page refreshes", async ({ page, context }) => {
      // Set up a mock session cookie
      await context.addCookies([
        {
          name: "better-auth.session_token",
          value: "mock-session-token",
          domain: "localhost",
          path: "/",
        },
      ]);

      // Mock the session validation endpoint
      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "123", email: "test@example.com", name: "Test User" },
          }),
        });
      });

      // Visit a protected page
      await page.goto("/dashboard");

      // Should not be redirected to sign-in
      await expect(page).not.toHaveURL(/\/sign-in/);
    });

    test("redirects after session expires", async ({ page, context }) => {
      // Clear any existing cookies
      await context.clearCookies();

      // Visit a protected page
      await page.goto("/dashboard");

      // Should be redirected to sign-in
      await expect(page).toHaveURL(/\/sign-in/);
    });
  });

  test.describe("Form Accessibility", () => {
    test("sign in form is keyboard navigable", async ({ page }) => {
      await page.goto("/sign-in");

      // Tab through the form
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Email")).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Password")).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();
    });

    test("sign up form is keyboard navigable", async ({ page }) => {
      await page.goto("/sign-up");

      // Tab through the form
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Name")).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Email")).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Password")).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Create account" })).toBeFocused();
    });

    test("form can be submitted with Enter key", async ({ page }) => {
      await page.goto("/sign-in");

      // Mock the auth endpoint
      let formSubmitted = false;
      await page.route("**/api/auth/sign-in/email", async (route) => {
        formSubmitted = true;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Invalid credentials" }),
        });
      });

      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.keyboard.press("Enter");

      // Wait for form submission
      await page.waitForTimeout(500);
      expect(formSubmitted).toBe(true);
    });
  });
});

test.describe("Password Reset Flow", () => {
  test.describe("Forgot Password Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/forgot-password");
    });

    test("displays forgot password form", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
    });

    test("has link back to sign in", async ({ page }) => {
      const backLink = page.getByRole("link", { name: "Back to sign in" });
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL("/sign-in");
    });

    test("shows validation error for invalid email", async ({ page }) => {
      await page.getByLabel("Email").fill("invalid-email");
      await page.getByRole("button", { name: "Send reset link" }).click();

      await expect(page.getByText("Invalid email address")).toBeVisible();
    });

    test("shows loading state during submission", async ({ page }) => {
      await page.route("**/api/auth/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.getByLabel("Email").fill("test@example.com");
      await page.getByRole("button", { name: "Send reset link" }).click();

      await expect(page.getByRole("button", { name: "Sending..." })).toBeVisible();
    });

    test("shows success message when reset email sent", async ({ page }) => {
      await page.route("**/api/auth/forget-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      });

      await page.getByLabel("Email").fill("test@example.com");
      await page.getByRole("button", { name: "Send reset link" }).click();

      await expect(page.getByText("Password reset link sent")).toBeVisible();
    });

    test("navigates from sign in to forgot password", async ({ page }) => {
      await page.goto("/sign-in");
      await page.getByRole("link", { name: "Forgot password?" }).click();

      await expect(page).toHaveURL("/forgot-password");
    });
  });

  test.describe("Reset Password Page", () => {
    test("shows error when no token provided", async ({ page }) => {
      await page.goto("/reset-password");

      await expect(page.getByText("No reset token provided")).toBeVisible();
      await expect(page.getByRole("link", { name: "Request new reset link" })).toBeVisible();
    });

    test("displays reset form when token provided", async ({ page }) => {
      await page.goto("/reset-password?token=valid-token");

      await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
      await expect(page.getByLabel("New Password")).toBeVisible();
      await expect(page.getByLabel("Confirm Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Reset password" })).toBeVisible();
    });

    test("shows validation error for short password", async ({ page }) => {
      await page.goto("/reset-password?token=valid-token");

      await page.getByLabel("New Password").fill("short");
      await page.getByLabel("Confirm Password").fill("short");
      await page.getByRole("button", { name: "Reset password" }).click();

      await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    });

    test("shows validation error when passwords don't match", async ({ page }) => {
      await page.goto("/reset-password?token=valid-token");

      await page.getByLabel("New Password").fill("password123");
      await page.getByLabel("Confirm Password").fill("differentpass");
      await page.getByRole("button", { name: "Reset password" }).click();

      await expect(page.getByText("Passwords don't match")).toBeVisible();
    });

    test("shows error for invalid/expired token", async ({ page }) => {
      await page.goto("/reset-password?error=INVALID_TOKEN");

      await expect(page.getByText("invalid or has expired")).toBeVisible();
    });

    test("shows success message on successful reset", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto("/reset-password?token=valid-token");

      await page.getByLabel("New Password").fill("newpassword123");
      await page.getByLabel("Confirm Password").fill("newpassword123");
      await page.getByRole("button", { name: "Reset password" }).click();

      await expect(page.getByText("Password reset successfully")).toBeVisible();
    });

    test("has link to sign in", async ({ page }) => {
      await page.goto("/reset-password?token=valid-token");

      const signInLink = page.getByRole("link", { name: "Sign in" });
      await expect(signInLink).toBeVisible();
    });
  });
});

test.describe("Email Verification Flow", () => {
  test("shows success message on successful verification", async ({ page }) => {
    await page.goto("/verify-email");

    await expect(page.getByRole("heading", { name: "Email Verification" })).toBeVisible();
    await expect(page.getByText("verified successfully")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to Sign In" })).toBeVisible();
  });

  test("shows error for invalid token", async ({ page }) => {
    await page.goto("/verify-email?error=invalid_token");

    await expect(page.getByText("invalid or has expired")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Sign Up" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Sign In" })).toBeVisible();
  });

  test("shows error for INVALID_TOKEN error code", async ({ page }) => {
    await page.goto("/verify-email?error=INVALID_TOKEN");

    await expect(page.getByText("invalid or has expired")).toBeVisible();
  });

  test("shows generic error for other error types", async ({ page }) => {
    await page.goto("/verify-email?error=unknown_error");

    await expect(page.getByText("An error occurred")).toBeVisible();
  });

  test("can navigate to sign up from error state", async ({ page }) => {
    await page.goto("/verify-email?error=invalid_token");

    await page.getByRole("link", { name: "Back to Sign Up" }).click();
    await expect(page).toHaveURL("/sign-up");
  });

  test("can navigate to sign in from error state", async ({ page }) => {
    await page.goto("/verify-email?error=invalid_token");

    await page.getByRole("link", { name: "Go to Sign In" }).click();
    await expect(page).toHaveURL("/sign-in");
  });
});
