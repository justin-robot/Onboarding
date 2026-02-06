import { currentUser } from "@repo/auth/server";
import { NextResponse } from "next/server";

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
 * Custom error for auth failures
 */
export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
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
    console.error("API Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
