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
 *
 * Body: { name: string, description?: string, dueDate?: string, inviteEmails?: string[] }
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

    // Add creator as admin member
    await memberService.addMember({
      workspaceId: workspace.id,
      userId: user.id,
      role: "admin",
    });

    // Handle email invitations if provided
    // Note: Emails are NOT sent here because new workspaces start in draft mode.
    // Invitation emails will be sent when the workspace is published.
    let invitationResults: { created: number; failed: number; errors: string[] } | undefined;

    if (body.inviteEmails && Array.isArray(body.inviteEmails) && body.inviteEmails.length > 0) {
      invitationResults = { created: 0, failed: 0, errors: [] };

      for (const email of body.inviteEmails) {
        if (typeof email !== "string" || !email.trim()) continue;

        const trimmedEmail = email.trim().toLowerCase();

        // Skip self-invites
        if (trimmedEmail === user.email?.toLowerCase()) {
          invitationResults.failed++;
          invitationResults.errors.push(`${trimmedEmail}: Cannot invite yourself`);
          continue;
        }

        try {
          // Create invitation (no email sent - workspace is in draft mode)
          const result = await invitationService.create({
            workspaceId: workspace.id,
            email: trimmedEmail,
            role: "user",
            invitedBy: user.id,
          });

          if (!result.success) {
            invitationResults.failed++;
            if (result.error === "ALREADY_MEMBER") {
              invitationResults.errors.push(`${trimmedEmail}: Already a member`);
            } else if (result.error === "ALREADY_INVITED") {
              invitationResults.errors.push(`${trimmedEmail}: Already invited`);
            }
            continue;
          }

          invitationResults.created++;
        } catch (error) {
          invitationResults.failed++;
          invitationResults.errors.push(`${trimmedEmail}: Failed to create invitation`);
          console.error(`Failed to create invitation for ${trimmedEmail}:`, error);
        }
      }
    }

    return json({
      workspace,
      invitationResults,
    }, 201);
  });
}
