"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoxoLayout,
  WorkspaceSidebar,
  FlowView,
  type FlowSection,
} from "@repo/design/components/moxo-layout";
import type { SectionStatus } from "@repo/design/components/moxo-layout";
import { TaskDetailsPanel } from "./components/task-details-panel";
import { FilesView, type FileItem } from "./components/files-view";
import { MembersPanel } from "./components/members-panel";

interface WorkspaceData {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    status: "not_started" | "in_progress" | "completed";
    tasks: Array<{
      id: string;
      title: string;
      type: "form" | "acknowledgement" | "file_upload" | "approval" | "booking" | "esign";
      position: number;
      isYourTurn: boolean;
      isCompleted: boolean;
      isLocked: boolean;
      description: string | null;
      dueDate?: string;
    }>;
  }>;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

interface SidebarWorkspace {
  id: string;
  name: string;
  progress: number;
  isCompleted: boolean;
}

interface WorkspaceViewProps {
  workspace: WorkspaceData;
  members: Member[];
  sidebarWorkspaces: SidebarWorkspace[];
  currentWorkspaceId: string;
  currentUserId: string;
  currentUserRole: string;
  files?: FileItem[];
}

export function WorkspaceView({
  workspace,
  members,
  sidebarWorkspaces,
  currentWorkspaceId,
  currentUserId,
  currentUserRole,
  files = [],
}: WorkspaceViewProps) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"flow" | "files">("flow");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  // Transform workspace sections for FlowView
  const flowSections: FlowSection[] = workspace.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description || undefined,
    status: section.status as SectionStatus,
    tasks: section.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: task.type,
      position: task.position,
      isYourTurn: task.isYourTurn,
      isCompleted: task.isCompleted,
      isLocked: task.isLocked,
      description: task.description || undefined,
      dueDate: task.dueDate,
    })),
  }));

  // Get currently selected task
  const selectedTask = selectedTaskId
    ? workspace.sections.flatMap((s) => s.tasks).find((t) => t.id === selectedTaskId)
    : null;

  // Handle task selection
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowMembersPanel(false);
    setRightPanelOpen(true);
  };

  // Handle members panel
  const handleMembersClick = () => {
    setSelectedTaskId(null);
    setShowMembersPanel(true);
    setRightPanelOpen(true);
  };

  // Handle workspace navigation
  const handleWorkspaceSelect = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`);
  };

  // Workspace header data
  const workspaceHeader = {
    name: workspace.name,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      avatarUrl: undefined,
    })),
    totalMembers: members.length,
    onMembersClick: handleMembersClick,
    onMoreClick: () => {
      // TODO: Open workspace menu
    },
  };

  return (
    <MoxoLayout
      sidebar={
        <WorkspaceSidebar
          workspaces={sidebarWorkspaces}
          selectedWorkspaceId={currentWorkspaceId}
          onWorkspaceSelect={handleWorkspaceSelect}
          onCreateWorkspace={() => router.push("/workspaces")}
        />
      }
      flowContent={
        <FlowView
          sections={flowSections}
          selectedTaskId={selectedTaskId || undefined}
          onTaskSelect={handleTaskSelect}
          showTimeline={true}
          timelinePosition="left"
        />
      }
      filesContent={
        <FilesView
          files={files}
          workspaceId={currentWorkspaceId}
          onFileClick={(file) => {
            // TODO: Handle file click (preview)
          }}
          onUpload={() => {
            // TODO: Open upload dialog
          }}
        />
      }
      rightPanel={
        showMembersPanel ? (
          <MembersPanel
            workspaceId={currentWorkspaceId}
            onClose={() => setShowMembersPanel(false)}
            currentUserRole={currentUserRole}
          />
        ) : selectedTask ? (
          <TaskDetailsPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onTaskComplete={() => {
              router.refresh();
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
            Select a task to view details
          </div>
        )
      }
      workspace={workspaceHeader}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showRightPanel={true}
      sidebarTitle="Workspaces"
      rightPanelTitle={showMembersPanel ? "Members" : selectedTask ? selectedTask.title : "Details"}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      rightPanelOpen={rightPanelOpen}
      onRightPanelOpenChange={setRightPanelOpen}
    />
  );
}
