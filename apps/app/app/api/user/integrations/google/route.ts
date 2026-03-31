import { requireAuth, withErrorHandler, json, errorResponse } from "../../../_lib/api-utils";
import { database } from "@repo/database";
import { z } from "zod";

/**
 * GET /api/user/integrations/google
 * Get all Google Calendar connections for the current user
 */
export async function GET() {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    // Get all workspace integrations where the user connected Google Calendar
    const integrations = await database
      .selectFrom("workspace_integration")
      .innerJoin("workspace", "workspace.id", "workspace_integration.workspaceId")
      .select([
        "workspace_integration.id",
        "workspace_integration.workspaceId",
        "workspace.name as workspaceName",
        "workspace_integration.accountEmail",
        "workspace_integration.createdAt",
      ])
      .where("workspace_integration.provider", "=", "google_calendar")
      .where("workspace_integration.connectedBy", "=", user.id)
      .execute();

    return json({
      integrations: integrations.map((i) => ({
        id: i.id,
        workspaceId: i.workspaceId,
        workspaceName: i.workspaceName,
        accountEmail: i.accountEmail,
        connectedAt: i.createdAt,
      })),
    });
  });
}

const disconnectSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

/**
 * DELETE /api/user/integrations/google
 * Disconnect Google Calendar from a workspace
 */
export async function DELETE(request: Request) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = disconnectSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message ?? "Invalid input", 400);
    }

    const { workspaceId } = parsed.data;

    // Verify the user connected this integration (only the person who connected can disconnect)
    const integration = await database
      .selectFrom("workspace_integration")
      .select(["id", "connectedBy"])
      .where("workspaceId", "=", workspaceId)
      .where("provider", "=", "google_calendar")
      .executeTakeFirst();

    if (!integration) {
      return errorResponse("Integration not found", 404);
    }

    if (integration.connectedBy !== user.id) {
      return errorResponse("You can only disconnect integrations you connected", 403);
    }

    // Delete the integration
    await database
      .deleteFrom("workspace_integration")
      .where("id", "=", integration.id)
      .execute();

    return json({ success: true });
  });
}
