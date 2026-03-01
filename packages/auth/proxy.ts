import { getSessionCookie } from "better-auth/cookies";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function authMiddleware(
  middlewareFn?: (
    _auth: { req: NextRequest; authorized: boolean },
    request: NextRequest,
    event: NextFetchEvent
  ) => Promise<Response> | Response
) {
  return async function middleware(
    request: NextRequest,
    event: NextFetchEvent
  ) {
    const { pathname } = request.nextUrl;

    // Define public routes (unauthenticated pages)
    const publicRoutes = [
      "/sign-in",
      "/sign-up",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];

    // Check if current path is a public route
    const isPublicRoute = publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Always allow API routes - they handle their own authentication and return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    const sessionCookie = getSessionCookie(request);
    const authorized = Boolean(sessionCookie);

    // Run custom middleware function if provided
    if (middlewareFn) {
      const response = await middlewareFn(
        { req: request, authorized },
        request,
        event
      );

      if (response && response.headers.get("Location")) {
        return response;
      }
    }

    // Redirect authenticated users away from public routes
    if (authorized && isPublicRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Redirect unauthenticated users to sign-in
    if (!authorized && !isPublicRoute) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return NextResponse.next();
  };
}
