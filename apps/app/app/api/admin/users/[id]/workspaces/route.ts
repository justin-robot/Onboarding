import { database } from "@repo/database";
import {
  json,
  errorResponse,
  requireAdminAuth,
  withErrorHandler,
} from "../../../../_lib/api-utils";
import { memberService } from "@/lib/services/member";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]/workspaces - Get user's workspace details with task progress
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id: userId } = await params;

    // If user has no admin workspaces, return empty
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ data: [] });
    }

    // Get all workspaces the user is a member of with task stats (scoped)
    let query = database
      .selectFrom("workspace_member")
      .innerJoin("workspace", "workspace.id", "workspace_member.workspaceId")
      .select([
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
        "workspace_member.role",
      ])
      .select((eb) => [
        // Total tasks assigned to user in this workspace
        eb
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
          .where("task_assignee.userId", "=", userId)
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .as("totalTasks"),
        // Completed tasks
        eb
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
          .where("task_assignee.userId", "=", userId)
          .where("task_assignee.status", "=", "completed")
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .as("completedTasks"),
      ])
      .where("workspace_member.userId", "=", userId)
      .where("workspace.deletedAt", "is", null);

    // Scope by workspace IDs if not platform admin
    if (workspaceIds !== null) {
      query = query.where("workspace.id", "in", workspaceIds);
    }

    const workspaces = await query
      .orderBy("workspace.name", "asc")
      .execute();

    // Format the response
    const workspacesWithProgress = workspaces.map((w) => ({
      workspaceId: w.workspaceId,
      workspaceName: w.workspaceName,
      role: w.role,
      totalTasks: Number(w.totalTasks || 0),
      completedTasks: Number(w.completedTasks || 0),
    }));

    return json({ data: workspacesWithProgress });
  });
}

/**
 * POST /api/admin/users/[id]/workspaces - Add user to a workspace
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { user, workspaceIds } = await requireAdminAuth();
    const { id: userId } = await params;

    const body = await request.json();
    const { workspaceId, role = "member" } = body;

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    if (role !== "member" && role !== "manager") {
      return errorResponse("role must be 'member' or 'manager'", 400);
    }

    // Check admin has access to this workspace
    if (workspaceIds !== null && !workspaceIds.includes(workspaceId)) {
      return errorResponse("Workspace not found", 404);
    }

    // Verify workspace exists and is not deleted
    const workspace = await database
      .selectFrom("workspace")
      .select("id")
      .where("id", "=", workspaceId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    // Use memberService.addMember with audit context
    try {
      const member = await memberService.addMember(
        { workspaceId, userId, role },
        { actorId: user.id, source: "admin" }
      );
      return json({ success: true, member }, 201);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("already a member")
      ) {
        return errorResponse("User is already a member of this workspace", 400);
      }
      throw error;
    }
  });
}
