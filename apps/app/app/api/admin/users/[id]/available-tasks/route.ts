import { database } from "@repo/database";
import { json, requireAdminAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

interface TaskInfo {
  taskId: string;
  title: string;
  type: string;
  status: string;
  sectionTitle: string;
}

interface TaskGroup {
  workspaceId: string;
  workspaceName: string;
  tasks: TaskInfo[];
}

/**
 * GET /api/admin/users/[id]/available-tasks
 * Get tasks that the user is NOT assigned to, in workspaces the user IS a member of
 * - Platform admins: see all tasks in user's workspaces
 * - Managers: see only tasks in workspaces they manage AND user is a member of
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();
    const { id: userId } = await params;

    // Get workspace IDs the user is a member of
    const memberships = await database
      .selectFrom("workspace_member")
      .select("workspaceId")
      .where("userId", "=", userId)
      .execute();

    let userWorkspaceIds = memberships.map((m) => m.workspaceId);

    // Empty if user is not in any workspace
    if (userWorkspaceIds.length === 0) {
      return json({ data: [] });
    }

    // For managers, intersect with their managed workspaces
    if (workspaceIds !== null) {
      userWorkspaceIds = userWorkspaceIds.filter((id) =>
        workspaceIds.includes(id)
      );
      if (userWorkspaceIds.length === 0) {
        return json({ data: [] });
      }
    }

    // Get task IDs user is already assigned to
    const existingAssignments = await database
      .selectFrom("task_assignee")
      .select("taskId")
      .where("userId", "=", userId)
      .execute();

    const assignedTaskIds = existingAssignments.map((a) => a.taskId);

    // Query available tasks
    let query = database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "task.id as taskId",
        "task.title",
        "task.type",
        "task.status",
        "section.title as sectionTitle",
        "section.position as sectionPosition",
        "task.position as taskPosition",
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("task.deletedAt", "is", null)
      .where("workspace.deletedAt", "is", null)
      .where("workspace.id", "in", userWorkspaceIds);

    // Exclude already assigned tasks
    if (assignedTaskIds.length > 0) {
      query = query.where("task.id", "not in", assignedTaskIds);
    }

    const tasks = await query
      .orderBy("workspace.name", "asc")
      .orderBy("section.position", "asc")
      .orderBy("task.position", "asc")
      .execute();

    // Group by workspace for UI
    const groupedTasks: Record<string, TaskGroup> = {};

    for (const task of tasks) {
      if (!groupedTasks[task.workspaceId]) {
        groupedTasks[task.workspaceId] = {
          workspaceId: task.workspaceId,
          workspaceName: task.workspaceName,
          tasks: [],
        };
      }
      groupedTasks[task.workspaceId].tasks.push({
        taskId: task.taskId,
        title: task.title,
        type: task.type,
        status: task.status,
        sectionTitle: task.sectionTitle,
      });
    }

    return json({ data: Object.values(groupedTasks) });
  });
}
