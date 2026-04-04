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

// Main tabs that should stay mounted to preserve their state
type MainTab = "overview" | "users" | "workspaces" | "templates" | "tasks" | "members" | "invitations" | "audit-logs";

const AdminClient = () => {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Track which tabs have been visited to lazy-mount them
  const [visitedTabs, setVisitedTabs] = useState<Set<MainTab>>(new Set());

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

  // Determine the current active tab from pathname
  const getActiveTab = (): MainTab | null => {
    if (pathname === "/dashboard") return "overview";
    if (pathname === "/dashboard/users") return "users";
    if (pathname === "/dashboard/workspaces") return "workspaces";
    if (pathname === "/dashboard/templates") return "templates";
    if (pathname === "/dashboard/tasks") return "tasks";
    if (pathname === "/dashboard/members") return "members";
    if (pathname === "/dashboard/invitations") return "invitations";
    if (pathname === "/dashboard/audit-logs") return "audit-logs";
    return null; // Detail/edit pages
  };

  const activeTab = getActiveTab();

  // Mark current tab as visited for lazy mounting
  useEffect(() => {
    if (activeTab && !visitedTabs.has(activeTab)) {
      setVisitedTabs(prev => new Set(prev).add(activeTab));
    }
  }, [activeTab, visitedTabs]);

  // Check if we're on a detail/edit page that needs dynamic rendering
  const renderDetailContent = () => {
    // User routes
    if (pathname === "/dashboard/users/create") {
      if (!isPlatformAdmin) {
        return null; // Will show UserList via the persistent tab
      }
      return <UserCreate />;
    }
    if (pathname.startsWith("/dashboard/users/") && pathname !== "/dashboard/users") {
      const userId = pathname.split("/dashboard/users/")[1];
      if (userId && userId !== "create") {
        return <UserEdit userId={userId} isPlatformAdmin={isPlatformAdmin} currentUserId={currentUserId} />;
      }
    }

    // Workspace routes
    if (pathname.startsWith("/dashboard/workspaces/") && pathname !== "/dashboard/workspaces") {
      const workspaceId = pathname.split("/dashboard/workspaces/")[1];
      if (workspaceId) {
        return <WorkspaceEdit workspaceId={workspaceId} />;
      }
    }

    // Template routes
    if (pathname.startsWith("/dashboard/templates/") && pathname !== "/dashboard/templates") {
      const templateId = pathname.split("/dashboard/templates/")[1];
      if (templateId) {
        return <TemplateDetail templateId={templateId} />;
      }
    }

    // Task routes
    if (pathname.startsWith("/dashboard/tasks/") && pathname !== "/dashboard/tasks") {
      const taskId = pathname.split("/dashboard/tasks/")[1];
      if (taskId) {
        return <TaskEdit taskId={taskId} />;
      }
    }

    return null;
  };

  const detailContent = renderDetailContent();

  // If we're on a detail page, render that instead
  if (detailContent) {
    return <AdminLayout>{detailContent}</AdminLayout>;
  }

  // Render main tabs - keep visited ones mounted but hidden
  return (
    <AdminLayout>
      {/* Overview */}
      {visitedTabs.has("overview") && (
        <div className={activeTab === "overview" ? "" : "hidden"}>
          <DashboardOverview />
        </div>
      )}

      {/* Users */}
      {visitedTabs.has("users") && (
        <div className={activeTab === "users" ? "" : "hidden"}>
          <UserList isPlatformAdmin={isPlatformAdmin} />
        </div>
      )}

      {/* Workspaces */}
      {visitedTabs.has("workspaces") && (
        <div className={activeTab === "workspaces" ? "" : "hidden"}>
          <WorkspaceList />
        </div>
      )}

      {/* Templates */}
      {visitedTabs.has("templates") && (
        <div className={activeTab === "templates" ? "" : "hidden"}>
          <TemplateList />
        </div>
      )}

      {/* Tasks */}
      {visitedTabs.has("tasks") && (
        <div className={activeTab === "tasks" ? "" : "hidden"}>
          <TaskList />
        </div>
      )}

      {/* Members */}
      {visitedTabs.has("members") && (
        <div className={activeTab === "members" ? "" : "hidden"}>
          <MemberList />
        </div>
      )}

      {/* Invitations */}
      {visitedTabs.has("invitations") && (
        <div className={activeTab === "invitations" ? "" : "hidden"}>
          <InvitationList />
        </div>
      )}

      {/* Audit Logs */}
      {visitedTabs.has("audit-logs") && (
        <div className={activeTab === "audit-logs" ? "" : "hidden"}>
          <AuditLogList />
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminClient;
