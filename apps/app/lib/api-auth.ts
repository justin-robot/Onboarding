import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser } from "@repo/auth/server";
import {
  accessService,
  NotWorkspaceMemberError,
  InsufficientPermissionsError,
} from "@/lib/services";
import type { MemberRole, AuditContext, AuditSource } from "@/lib/services";

/**
 * Authenticated user from session
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
}

/**
 * Context for authenticated API requests
 */
export interface ApiContext {
  user: AuthenticatedUser;
  auditContext: AuditContext;
}

/**
 * Context for workspace-scoped API requests
 */
export interface WorkspaceApiContext extends ApiContext {
  workspaceId: string;
  role: MemberRole;
}

/**
 * Error response helper
 */
function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Get IP address from request headers
 */
async function getIpAddress(): Promise<string | undefined> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    undefined
  );
}

/**
 * Create audit context from authenticated user
 */
async function createAuditContext(
  userId: string,
  source: AuditSource = "api"
): Promise<AuditContext> {
  const ipAddress = await getIpAddress();
  return {
    actorId: userId,
    source,
    ipAddress,
  };
}

/**
 * Require authentication for an API route
 * Returns the authenticated user or an error response
 */
export async function requireAuth(): Promise<
  | { success: true; user: AuthenticatedUser; auditContext: AuditContext }
  | { success: false; response: NextResponse }
> {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        response: errorResponse("Unauthorized", 401),
      };
    }

    const auditContext = await createAuditContext(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
      },
      auditContext,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return {
      success: false,
      response: errorResponse("Authentication failed", 401),
    };
  }
}

/**
 * Require workspace access for an API route
 * Returns the authenticated user, workspace role, and audit context
 */
export async function requireWorkspaceAccess(
  workspaceId: string
): Promise<
  | { success: true; user: AuthenticatedUser; role: MemberRole; auditContext: AuditContext }
  | { success: false; response: NextResponse }
> {
  // First require authentication
  const authResult = await requireAuth();
  if (!authResult.success) {
    return authResult;
  }

  try {
    const { role } = await accessService.requireWorkspaceAccess(
      workspaceId,
      authResult.user.id
    );

    return {
      success: true,
      user: authResult.user,
      role,
      auditContext: authResult.auditContext,
    };
  } catch (error) {
    if (error instanceof NotWorkspaceMemberError) {
      return {
        success: false,
        response: errorResponse("You are not a member of this workspace", 403),
      };
    }
    console.error("Workspace access error:", error);
    return {
      success: false,
      response: errorResponse("Access denied", 403),
    };
  }
}

/**
 * Require minimum role for an API route
 */
export async function requireRole(
  workspaceId: string,
  requiredRole: MemberRole
): Promise<
  | { success: true; user: AuthenticatedUser; role: MemberRole; auditContext: AuditContext }
  | { success: false; response: NextResponse }
> {
  // First require workspace access
  const accessResult = await requireWorkspaceAccess(workspaceId);
  if (!accessResult.success) {
    return accessResult;
  }

  try {
    await accessService.requireMinimumRole(
      workspaceId,
      accessResult.user.id,
      requiredRole
    );

    return accessResult;
  } catch (error) {
    if (error instanceof InsufficientPermissionsError) {
      return {
        success: false,
        response: errorResponse(error.message, 403),
      };
    }
    console.error("Role check error:", error);
    return {
      success: false,
      response: errorResponse("Access denied", 403),
    };
  }
}

/**
 * Require admin role for an API route
 */
export async function requireAdmin(
  workspaceId: string
): Promise<
  | { success: true; user: AuthenticatedUser; role: MemberRole; auditContext: AuditContext }
  | { success: false; response: NextResponse }
> {
  return requireRole(workspaceId, "admin");
}

/**
 * Require admin role for an API route (previously account manager or admin)
 * @deprecated Use requireAdmin instead - this function name is misleading now that account_manager role is removed
 */
export async function requireAccountManager(
  workspaceId: string
): Promise<
  | { success: true; user: AuthenticatedUser; role: MemberRole; auditContext: AuditContext }
  | { success: false; response: NextResponse }
> {
  return requireRole(workspaceId, "admin");
}

/**
 * Wrapper for API route handlers that require authentication
 * Automatically handles error responses
 */
export function withAuth<T>(
  handler: (context: ApiContext) => Promise<T>
): () => Promise<T | NextResponse> {
  return async () => {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    return handler({
      user: authResult.user,
      auditContext: authResult.auditContext,
    });
  };
}

/**
 * Wrapper for API route handlers that require workspace access
 * Automatically handles error responses
 */
export function withWorkspaceAccess<T>(
  getWorkspaceId: () => string | Promise<string>,
  handler: (context: WorkspaceApiContext) => Promise<T>
): () => Promise<T | NextResponse> {
  return async () => {
    const workspaceId = await getWorkspaceId();
    const accessResult = await requireWorkspaceAccess(workspaceId);

    if (!accessResult.success) {
      return accessResult.response;
    }

    return handler({
      user: accessResult.user,
      workspaceId,
      role: accessResult.role,
      auditContext: accessResult.auditContext,
    });
  };
}

/**
 * Wrapper for API route handlers that require admin access
 */
export function withAdminAccess<T>(
  getWorkspaceId: () => string | Promise<string>,
  handler: (context: WorkspaceApiContext) => Promise<T>
): () => Promise<T | NextResponse> {
  return async () => {
    const workspaceId = await getWorkspaceId();
    const accessResult = await requireAdmin(workspaceId);

    if (!accessResult.success) {
      return accessResult.response;
    }

    return handler({
      user: accessResult.user,
      workspaceId,
      role: accessResult.role,
      auditContext: accessResult.auditContext,
    });
  };
}
