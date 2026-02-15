"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MoxoLayout,
  WorkspaceSidebar,
  FlowView,
  UploadDialog,
  FilePreviewModal,
  type FlowSection,
  type PreviewFile,
} from "@repo/design/components/moxo-layout";
import type { SectionStatus } from "@repo/design/components/moxo-layout";
import { TaskDetailsPanel } from "./components/task-details-panel";
import { FilesView, type FileItem } from "./components/files-view";
import { MembersPanel } from "./components/members-panel";
import { RealtimeChat } from "./components/realtime-chat";
import { RealtimeWorkspaceEvents } from "./components/realtime-workspace-events";
import type { Message } from "./components/chat-panel";
import { AddTaskDialog } from "./components/add-task-dialog";
import { AddSectionDialog } from "./components/add-section-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/design/components/ui/sheet";
import { Button } from "@repo/design/components/ui/button";
import {
  FolderPlus,
  Plus,
  Settings,
  Users,
  Bookmark,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [addTaskSectionId, setAddTaskSectionId] = useState<string | null>(null);
  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileItem[]>(files);

  // Initial messages state (fetched once, then real-time takes over)
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  // Fetch initial messages once on mount
  useEffect(() => {
    const fetchInitialMessages = async () => {
      try {
        const response = await fetch(`/api/workspaces/${currentWorkspaceId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const formattedMessages: Message[] = data.messages.reverse().map((msg: {
            id: string;
            type: string;
            content: string;
            senderId: string;
            senderName: string;
            senderAvatarUrl?: string;
            createdAt: string;
          }) => ({
            id: msg.id,
            type: msg.type as Message["type"],
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderAvatarUrl: msg.senderAvatarUrl,
            createdAt: new Date(msg.createdAt),
          }));
          setInitialMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Failed to fetch initial messages:", error);
      } finally {
        setMessagesLoaded(true);
      }
    };

    fetchInitialMessages();
  }, [currentWorkspaceId]);

  // Transform workspace sections for FlowView
  const flowSections: FlowSection[] = (workspace.sections || []).map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description || undefined,
    status: section.status as SectionStatus,
    tasks: (section.tasks || []).map((task) => ({
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
    ? (workspace.sections || []).flatMap((s) => s.tasks || []).find((t) => t.id === selectedTaskId)
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

  // Handle add task
  const handleAddTask = (sectionId: string) => {
    setAddTaskSectionId(sectionId);
    setAddTaskDialogOpen(true);
  };

  // Get task count for the selected section
  const getTaskCount = (sectionId: string) => {
    const section = (workspace.sections || []).find((s) => s.id === sectionId);
    return section?.tasks?.length ?? 0;
  };

  // Handle workspace navigation
  const handleWorkspaceSelect = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`);
  };

  // Handle add task from menu (need to select a section first)
  const handleAddTaskFromMenu = () => {
    const sections = workspace.sections || [];
    if (sections.length === 0) {
      toast.error("Please create a section first");
      setAddSectionDialogOpen(true);
      return;
    }
    // Use the first section by default, or show section picker
    setAddTaskSectionId(sections[0].id);
    setAddTaskDialogOpen(true);
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
      setShowWorkspaceMenu(true);
    },
  };

  return (
    <>
    {/* Real-time workspace event subscriptions */}
    <RealtimeWorkspaceEvents
      workspaceId={currentWorkspaceId}
      onWorkspaceUpdate={() => router.refresh()}
    />

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
          onAddTask={currentUserRole === "admin" ? handleAddTask : undefined}
          showTimeline={true}
          timelinePosition="left"
        />
      }
      filesContent={
        <FilesView
          files={workspaceFiles}
          workspaceId={currentWorkspaceId}
          onFileClick={(file) => {
            if (file.type === "file") {
              setPreviewFile({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType || "application/octet-stream",
                size: file.size || 0,
                url: file.url,
                thumbnailUrl: file.thumbnailUrl,
                uploadedBy: file.uploadedBy,
                uploadedAt: file.uploadedAt,
              });
            }
          }}
          onUpload={() => {
            setUploadDialogOpen(true);
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
            isAdmin={currentUserRole === "admin"}
          />
        ) : messagesLoaded ? (
          <RealtimeChat
            workspaceId={currentWorkspaceId}
            currentUserId={currentUserId}
            initialMessages={initialMessages}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading chat...</div>
          </div>
        )
      }
      workspace={workspaceHeader}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showRightPanel={true}
      sidebarTitle="Workspaces"
      rightPanelTitle={showMembersPanel ? "Members" : selectedTask ? selectedTask.title : "Chat"}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      rightPanelOpen={rightPanelOpen}
      onRightPanelOpenChange={setRightPanelOpen}
    />

    {/* Add Task Dialog */}
    {addTaskSectionId && (
      <AddTaskDialog
        open={addTaskDialogOpen}
        onOpenChange={setAddTaskDialogOpen}
        sectionId={addTaskSectionId}
        currentTaskCount={getTaskCount(addTaskSectionId)}
        onTaskCreated={() => router.refresh()}
      />
    )}

    {/* Add Section Dialog */}
    <AddSectionDialog
      open={addSectionDialogOpen}
      onOpenChange={setAddSectionDialogOpen}
      workspaceId={currentWorkspaceId}
      currentSectionCount={(workspace.sections || []).length}
      onSectionCreated={() => router.refresh()}
    />

    {/* Upload Dialog */}
    <UploadDialog
      open={uploadDialogOpen}
      onOpenChange={setUploadDialogOpen}
      workspaceId={currentWorkspaceId}
      onUploadComplete={(uploadedFiles) => {
        // Add newly uploaded files to the list
        const newFiles: FileItem[] = uploadedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          type: "file" as const,
          mimeType: f.mimeType,
          size: f.size,
          uploadedAt: new Date(),
        }));
        setWorkspaceFiles((prev) => [...newFiles, ...prev]);
        toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      }}
      multiple
    />

    {/* File Preview Modal */}
    <FilePreviewModal
      open={previewFile !== null}
      onOpenChange={(open) => {
        if (!open) setPreviewFile(null);
      }}
      file={previewFile}
      onDelete={async (fileId) => {
        try {
          // TODO: Implement file deletion API
          setWorkspaceFiles((prev) => prev.filter((f) => f.id !== fileId));
          setPreviewFile(null);
          toast.success("File deleted");
        } catch (error) {
          toast.error("Failed to delete file");
        }
      }}
    />

    {/* Workspace Menu Sheet */}
    <Sheet open={showWorkspaceMenu} onOpenChange={setShowWorkspaceMenu}>
      <SheetContent side="right" className="w-[300px]">
        <SheetHeader>
          <SheetTitle>Workspace Menu</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {currentUserRole === "admin" && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setShowWorkspaceMenu(false);
                  setAddSectionDialogOpen(true);
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setShowWorkspaceMenu(false);
                  handleAddTaskFromMenu();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Action
              </Button>
              <div className="my-4 border-t" />
            </>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setShowWorkspaceMenu(false);
              handleMembersClick();
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            Members
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Bookmark className="mr-2 h-4 w-4" />
            Bookmarks
          </Button>
          {currentUserRole === "admin" && (
            <>
              <div className="my-4 border-t" />
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Zap className="mr-2 h-4 w-4" />
                Automations & Events
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  </>
  );
}
