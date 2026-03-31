"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "./admin-layout";
import { DashboardOverview } from "./overview";
import { UserList } from "./users/list";
import { UserEdit } from "./users/edit";
import { UserCreate } from "./users/create";
import { WorkspaceList } from "./workspaces/list";
import { WorkspaceEdit } from "./workspaces/edit";
import { TemplateList } from "./templates/list";
import { TemplateDetail } from "./templates/detail";
import { TaskList } from "./tasks/list";
import { TaskEdit } from "./tasks/edit";
import { MemberList } from "./members/list";
import { InvitationList } from "./invitations/list";
import { AuditLogList } from "./audit-logs/list";

const AdminClient = () => {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const response = await fetch("/api/admin/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setIsPlatformAdmin(data.isPlatformAdmin);
          setCurrentUserId(data.id);
        }
      } catch (error) {
        console.error("Error fetching admin profile:", error);
      }
    };

    fetchAdminProfile();
  }, []);

  // Determine which component to render based on the pathname
  const renderContent = () => {
    // User routes
    if (pathname === "/dashboard/users/create") {
      // Only platform admins can create users
      if (!isPlatformAdmin) {
        return <UserList isPlatformAdmin={isPlatformAdmin} />;
      }
      return <UserCreate />;
    }
    if (pathname.startsWith("/dashboard/users/") && pathname !== "/dashboard/users") {
      // Extract user ID for edit page
      const userId = pathname.split("/dashboard/users/")[1];
      if (userId && userId !== "create") {
        return <UserEdit userId={userId} isPlatformAdmin={isPlatformAdmin} currentUserId={currentUserId} />;
      }
    }
    if (pathname === "/dashboard/users") {
      return <UserList isPlatformAdmin={isPlatformAdmin} />;
    }

    // Workspace routes
    if (pathname.startsWith("/dashboard/workspaces/") && pathname !== "/dashboard/workspaces") {
      // Extract workspace ID for edit page
      const workspaceId = pathname.split("/dashboard/workspaces/")[1];
      if (workspaceId) {
        return <WorkspaceEdit workspaceId={workspaceId} />;
      }
    }
    if (pathname === "/dashboard/workspaces") {
      return <WorkspaceList />;
    }

    // Template routes
    if (pathname.startsWith("/dashboard/templates/") && pathname !== "/dashboard/templates") {
      // Extract template ID for detail page
      const templateId = pathname.split("/dashboard/templates/")[1];
      if (templateId) {
        return <TemplateDetail templateId={templateId} />;
      }
    }
    if (pathname === "/dashboard/templates") {
      return <TemplateList />;
    }

    // Task routes
    if (pathname.startsWith("/dashboard/tasks/") && pathname !== "/dashboard/tasks") {
      // Extract task ID for edit page
      const taskId = pathname.split("/dashboard/tasks/")[1];
      if (taskId) {
        return <TaskEdit taskId={taskId} />;
      }
    }
    if (pathname === "/dashboard/tasks") {
      return <TaskList />;
    }
    if (pathname === "/dashboard/members") {
      return <MemberList />;
    }
    if (pathname === "/dashboard/invitations") {
      return <InvitationList />;
    }
    if (pathname === "/dashboard/audit-logs") {
      return <AuditLogList />;
    }

    // Default: Overview
    return <DashboardOverview />;
  };

  return <AdminLayout>{renderContent()}</AdminLayout>;
};

export default AdminClient;
