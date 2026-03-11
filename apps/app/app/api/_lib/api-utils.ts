import { currentUser } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { adminAccessService } from "@/lib/services";

/**
 * Standard JSON response helper
 */
export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Error response helper
 */
export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Auth guard - returns current user or throws 401
 */
export async function requireAuth() {
  const user = await currentUser();
  if (!user) {
    throw new AuthError();
  }
  return user;
}

/**
 * Admin scope info returned by requireAdminAuth
 */
export interface AdminScope {
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>;
  isPlatformAdmin: boolean;
  /** Workspace IDs the user can admin. null means all (platform admin). */
  workspaceIds: string[] | null;
}

/**
 * Admin auth guard - returns user with admin scope or throws
 * Use this for admin API routes to get properly scoped data.
 */
export async function requireAdminAuth(): Promise<AdminScope> {
  const user = await currentUser();
  if (!user) {
    throw new AuthError();
  }

  const access = await adminAccessService.checkAccess(user.id);

  if (!access.canAccess) {
    throw new ForbiddenError();
  }

  return {
    user,
    isPlatformAdmin: access.isPlatformAdmin,
    workspaceIds: access.isPlatformAdmin ? null : access.adminWorkspaceIds,
  };
}

/**
 * Custom error for auth failures
 */
export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/**
 * Custom error for forbidden access
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Custom error for not found resources
 */
export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
  }
}

/**
 * Wrapper for API handlers with error handling
 */
export async function withErrorHandler(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof ForbiddenError) {
      return errorResponse(error.message || "Forbidden", 403);
    }
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof NotFoundError) {
      return errorResponse(error.message || "Not found", 404);
    }
    console.error("API Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
