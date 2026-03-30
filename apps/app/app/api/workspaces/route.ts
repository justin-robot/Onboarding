import { workspaceService, memberService, invitationService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/workspaces - List all workspaces
 */
export async function GET() {
  return withErrorHandler(async () => {
    await requireAuth();
    const workspaces = await workspaceService.list();
    return json(workspaces);
  });
}

/**
 * POST /api/workspaces - Create a new workspace
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return errorResponse("Name is required");
    }

    const workspace = await workspaceService.create({
      name: body.name,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });

    // Add creator as manager member
    await memberService.addMember({
      workspaceId: workspace.id,
      userId: user.id,
      role: "manager",
    });

    // Handle invite emails if provided
    // These invitations are created but emails are NOT sent until workspace is published
    let invitationResults = { created: 0, failed: 0 };
    if (body.inviteEmails && Array.isArray(body.inviteEmails)) {
      for (const email of body.inviteEmails) {
        if (typeof email === "string" && email.trim()) {
          const result = await invitationService.create({
            workspaceId: workspace.id,
            email: email.trim().toLowerCase(),
            role: "member",
            invitedBy: user.id,
          });
          if (result.success) {
            invitationResults.created++;
          } else {
            invitationResults.failed++;
          }
        }
      }
    }

    return json(workspace, 201);
  });
}
