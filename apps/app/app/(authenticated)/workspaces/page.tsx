import { auth } from "@repo/auth/server";
import { memberService, workspaceService } from "@/lib/services";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WorkspaceList } from "./workspace-list";

export const metadata: Metadata = {
  title: "Workspaces",
  description: "Manage your workspaces",
};

export default async function WorkspacesPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Get user's workspace memberships
  const memberships = await memberService.getWorkspacesForUser(session.user.id);

  // Fetch full workspace details for each membership
  const workspaces = await Promise.all(
    memberships.map(async (membership) => {
      const workspace = await workspaceService.getByIdWithNested(membership.workspaceId);
      if (!workspace) return null;

      // Calculate progress
      const totalTasks = workspace.sections.reduce(
        (sum, section) => sum + section.tasks.length,
        0
      );
      const completedTasks = workspace.sections.reduce(
        (sum, section) =>
          sum + section.tasks.filter((task) => task.status === "completed").length,
        0
      );
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        dueDate: workspace.dueDate,
        progress,
        totalTasks,
        completedTasks,
        isCompleted: progress === 100 && totalTasks > 0,
        role: membership.role,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      };
    })
  );

  // Filter out null values and sort by most recent activity
  const validWorkspaces = workspaces
    .filter((w): w is NonNullable<typeof w> => w !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <WorkspaceList
        workspaces={validWorkspaces}
        userId={session.user.id}
        userRole={session.user.role}
      />
    </div>
  );
}
