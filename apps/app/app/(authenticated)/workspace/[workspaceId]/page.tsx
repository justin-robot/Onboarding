import { auth } from "@repo/auth/server";
import { workspaceService, memberService, assigneeService, dependencyService } from "@/lib/services";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { WorkspaceView } from "./workspace-view";

interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { workspaceId } = await params;
  const workspace = await workspaceService.getById(workspaceId);

  return {
    title: workspace?.name || "Workspace",
    description: workspace?.description || "Workspace details",
  };
}

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = await params;
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Check if user is admin (can view any workspace)
  const isAdmin = session.user.role === "admin";

  // Check membership (admins can bypass this check)
  const membership = await memberService.getMember(workspaceId, session.user.id);
  if (!membership && !isAdmin) {
    notFound();
  }

  // Fetch workspace with nested data including lock status
  const workspace = await workspaceService.getByIdWithNestedAndLockStatus(workspaceId);
  if (!workspace) {
    notFound();
  }

  // Get all members for the workspace with user info
  const memberships = await memberService.getByWorkspaceIdWithUserInfo(workspaceId);

  // Get user's workspaces for sidebar
  const userMemberships = await memberService.getWorkspacesForUser(session.user.id);
  const sidebarWorkspaces = await Promise.all(
    userMemberships.map(async (m) => {
      const ws = await workspaceService.getByIdWithNested(m.workspaceId);
      if (!ws) return null;

      const sections = ws.sections || [];
      const totalTasks = sections.reduce((sum, s) => sum + (s.tasks || []).length, 0);
      const completedTasks = sections.reduce(
        (sum, s) => sum + (s.tasks || []).filter((t) => t.status === "completed").length,
        0
      );
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: ws.id,
        name: ws.name,
        progress,
        isCompleted: progress === 100 && totalTasks > 0,
      };
    })
  );

  const validSidebarWorkspaces = sidebarWorkspaces.filter((w): w is NonNullable<typeof w> => w !== null);

  // Get assignees per task for "your turn" detection and display
  // Get blocking dependencies for locked tasks
  const taskAssignments = new Map<string, { userIds: string[]; names: string[] }>();
  const taskBlockingDeps = new Map<string, Array<{ id: string; title: string }>>();

  for (const section of (workspace.sections || [])) {
    for (const task of (section.tasks || [])) {
      const assignees = await assigneeService.getByTaskIdWithUserInfo(task.id);
      taskAssignments.set(task.id, {
        userIds: assignees.map(a => a.userId),
        names: assignees.map(a => a.name),
      });

      // Fetch blocking dependencies for locked tasks
      if (task.locked) {
        const blockingDeps = await dependencyService.getBlockingDependencies(task.id);
        if (blockingDeps.length > 0) {
          taskBlockingDeps.set(
            task.id,
            blockingDeps.map(dep => ({
              id: dep.blockedByTask.id,
              title: dep.blockedByTask.title,
            }))
          );
        }
      }
    }
  }

  // Map task types from DB format to UI format
  const mapTaskType = (dbType: string): "form" | "acknowledgement" | "file_upload" | "approval" | "booking" | "esign" => {
    const typeMap: Record<string, "form" | "acknowledgement" | "file_upload" | "approval" | "booking" | "esign"> = {
      "FORM": "form",
      "ACKNOWLEDGEMENT": "acknowledgement",
      "FILE_REQUEST": "file_upload",
      "APPROVAL": "approval",
      "TIME_BOOKING": "booking",
      "E_SIGN": "esign",
    };
    return typeMap[dbType] || "form";
  };

  // Transform data for client component
  const workspaceData = {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    dueDate: workspace.dueDate?.toISOString() || null,
    sections: (workspace.sections || []).map((section) => {
      const tasks = section.tasks || [];
      const completedTasks = tasks.filter((t) => t.status === "completed").length;
      const totalTasks = tasks.length;

      let status: "not_started" | "in_progress" | "completed";
      if (completedTasks === totalTasks && totalTasks > 0) {
        status = "completed";
      } else if (completedTasks > 0) {
        status = "in_progress";
      } else {
        status = "not_started";
      }

      return {
        id: section.id,
        title: section.title,
        description: null,
        status,
        tasks: tasks.map((task, index) => {
          const assigneeData = taskAssignments.get(task.id) || { userIds: [], names: [] };
          const isYourTurn = assigneeData.userIds.includes(session.user.id) && task.status !== "completed" && !task.locked;
          const lockedByTasks = taskBlockingDeps.get(task.id);

          return {
            id: task.id,
            title: task.title,
            type: mapTaskType(task.type),
            position: index + 1,
            isYourTurn,
            isCompleted: task.status === "completed",
            isLocked: task.locked,
            lockedByTasks,
            assignees: assigneeData.names,
            description: task.description,
            dueDate: task.dueDateValue?.toISOString(),
            dueDateType: task.dueDateType as "absolute" | "relative" | undefined,
            createdAt: task.createdAt?.toISOString(),
            updatedAt: task.updatedAt?.toISOString(),
            completedAt: task.completedAt?.toISOString(),
          };
        }),
      };
    }),
  };

  const members = memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.name || m.email || "Unknown",
    email: m.email || "",
    role: m.role,
  }));

  return (
    <div className="h-full">
      <WorkspaceView
        workspace={workspaceData}
        members={members}
        sidebarWorkspaces={validSidebarWorkspaces}
        currentWorkspaceId={workspaceId}
        currentUserId={session.user.id}
        currentUserRole={membership?.role || (isAdmin ? "admin" : "user")}
      />
    </div>
  );
}
