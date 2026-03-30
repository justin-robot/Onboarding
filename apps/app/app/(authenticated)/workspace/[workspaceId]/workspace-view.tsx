"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { MeetingsPanel } from "./components/meetings-panel";
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
import { Badge } from "@repo/design/components/ui/badge";
import { Alert, AlertDescription } from "@repo/design/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import { Input } from "@repo/design/components/ui/input";
import { Switch } from "@repo/design/components/ui/switch";
import { Label } from "@repo/design/components/ui/label";
import {
  AlertCircle,
  Calendar,
  FolderPlus,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationsTrigger } from "@repo/notifications";
import { UserMenu } from "../../components/user-menu";
import { CreateWorkspaceDialog } from "../../workspaces/create-workspace-dialog";

interface WorkspaceData {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  isPublished: boolean;
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
      lockedByTasks?: Array<{ id: string; title: string }>;
      assignees?: string[];
      description: string | null;
      dueDate?: string;
      dueDateType?: "absolute" | "relative";
      createdAt?: string;
      updatedAt?: string;
      completedAt?: string;
      isDraft?: boolean; // Tasks created while workspace is in draft mode
    }>;
  }>;
}

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface SidebarWorkspace {
  id: string;
  name: string;
  progress: number;
  isCompleted: boolean;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
}

interface WorkspaceViewProps {
  workspace: WorkspaceData;
  members: Member[];
  pendingInvitations?: PendingInvitation[];
  sidebarWorkspaces: SidebarWorkspace[];
  currentWorkspaceId: string;
  currentUserId: string;
  currentUserRole: string;
  files?: FileItem[];
}

export function WorkspaceView({
  workspace,
  members,
  pendingInvitations = [],
  sidebarWorkspaces,
  currentWorkspaceId,
  currentUserId,
  currentUserRole,
  files = [],
}: WorkspaceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get("task");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);
  const [activeTab, setActiveTab] = useState<"flow" | "files">("flow");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(!!initialTaskId);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showMeetingsPanel, setShowMeetingsPanel] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false);
  const [deleteSectionDialog, setDeleteSectionDialog] = useState<{
    open: boolean;
    sectionId: string | null;
    sectionTitle: string;
  }>({ open: false, sectionId: null, sectionTitle: "" });
  const [editSectionDialog, setEditSectionDialog] = useState<{
    open: boolean;
    sectionId: string | null;
    sectionTitle: string;
  }>({ open: false, sectionId: null, sectionTitle: "" });
  const [editSectionLoading, setEditSectionLoading] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [createWorkspaceDialogOpen, setCreateWorkspaceDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileItem[]>(files);
  // Track recently completed task for green border highlight
  const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
  // Track section to scroll to after creation
  const [scrollToSectionId, setScrollToSectionId] = useState<string | null>(null);
  // Track workspace published state
  const [isPublished, setIsPublished] = useState(workspace.isPublished);
  const [publishToggleLoading, setPublishToggleLoading] = useState(false);

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
            updatedAt?: string;
            replyToMessageId?: string;
            replyToMessage?: {
              id: string;
              content: string;
              senderName: string;
              senderAvatarUrl?: string;
            };
          }) => ({
            id: msg.id,
            type: msg.type as Message["type"],
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderAvatarUrl: msg.senderAvatarUrl,
            createdAt: new Date(msg.createdAt),
            updatedAt: msg.updatedAt ? new Date(msg.updatedAt) : undefined,
            replyToMessageId: msg.replyToMessageId,
            replyToMessage: msg.replyToMessage,
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

  // Fetch files on mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/workspaces/${currentWorkspaceId}/files`);
        if (response.ok) {
          const data = await response.json();
          const formattedFiles: FileItem[] = data.files.map((file: {
            id: string;
            name: string;
            mimeType: string;
            size?: number;
            url?: string;
            thumbnailUrl?: string;
            uploadedBy?: string;
            createdAt?: string;
          }) => ({
            id: file.id,
            name: file.name,
            type: file.mimeType === "application/x-folder" ? "folder" as const : "file" as const,
            mimeType: file.mimeType,
            size: file.size,
            url: file.url,
            thumbnailUrl: file.thumbnailUrl,
            uploadedBy: file.uploadedBy,
            uploadedAt: file.createdAt ? new Date(file.createdAt) : undefined,
          }));
          setWorkspaceFiles(formattedFiles);
        }
      } catch (error) {
        console.error("Failed to fetch files:", error);
      }
    };

    fetchFiles();
  }, [currentWorkspaceId]);

  // Scroll to newly created section
  useEffect(() => {
    if (scrollToSectionId) {
      // Small delay to ensure DOM is updated after router.refresh()
      const timeoutId = setTimeout(() => {
        const sectionElement = document.querySelector(`[data-section-id="${scrollToSectionId}"]`);
        if (sectionElement) {
          sectionElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setScrollToSectionId(null);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [scrollToSectionId, workspace.sections]);

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
      lockedByTasks: task.lockedByTasks,
      assignees: task.assignees,
      description: task.description || undefined,
      dueDate: task.dueDate,
      isDraft: task.isDraft,
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
    setShowMeetingsPanel(false);
    setRightPanelOpen(true);
  };

  // Handle members panel
  const handleMembersClick = () => {
    setSelectedTaskId(null);
    setShowMembersPanel(true);
    setShowMeetingsPanel(false);
    setRightPanelOpen(true);
  };

  // Handle meetings panel
  const handleMeetingsClick = () => {
    setSelectedTaskId(null);
    setShowMembersPanel(false);
    setShowMeetingsPanel(true);
    setRightPanelOpen(true);
  };

  // Handle add task - opens the dialog (position selected in step 2)
  // sectionId is ignored - user picks position in the dialog
  const handleAddTask = (_sectionId?: string) => {
    setAddTaskDialogOpen(true);
  };

  // Handle workspace navigation
  const handleWorkspaceSelect = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`);
  };

  // Handle add task from menu
  const handleAddTaskFromMenu = () => {
    const sections = workspace.sections || [];
    if (sections.length === 0) {
      toast.error("Please create a section first");
      setAddSectionDialogOpen(true);
      return;
    }
    setAddTaskDialogOpen(true);
  };

  // Handle task reordering within a section
  const handleTaskReorder = async (sectionId: string, taskIds: string[]) => {
    try {
      const response = await fetch(`/api/sections/${sectionId}/tasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder tasks");
      }

      // Optimistically update the UI (router.refresh will sync with server)
      router.refresh();
    } catch (error) {
      toast.error("Failed to reorder tasks");
      router.refresh(); // Revert to server state
    }
  };

  // Handle section reordering
  const handleSectionReorder = async (sectionIds: string[]) => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspaceId}/sections/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder sections");
      }

      // Optimistically update the UI (router.refresh will sync with server)
      router.refresh();
    } catch (error) {
      toast.error("Failed to reorder sections");
      router.refresh(); // Revert to server state
    }
  };

  // Handle section delete request (opens confirmation dialog)
  const handleSectionDeleteRequest = (sectionId: string) => {
    const section = workspace.sections?.find((s) => s.id === sectionId);
    setDeleteSectionDialog({
      open: true,
      sectionId,
      sectionTitle: section?.title || "this section",
    });
  };

  // Handle section edit request (opens edit dialog)
  const handleSectionEditRequest = (sectionId: string) => {
    const section = workspace.sections?.find((s) => s.id === sectionId);
    setEditSectionDialog({
      open: true,
      sectionId,
      sectionTitle: section?.title || "",
    });
  };

  // Handle section edit confirmation
  const handleSectionEditConfirm = async () => {
    const sectionId = editSectionDialog.sectionId;
    const newTitle = editSectionDialog.sectionTitle.trim();
    if (!sectionId || !newTitle) return;

    setEditSectionLoading(true);
    try {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to update section");
      }

      toast.success("Section updated successfully");
      setEditSectionDialog({ open: false, sectionId: null, sectionTitle: "" });
      router.refresh();
    } catch (error) {
      toast.error("Failed to update section");
    } finally {
      setEditSectionLoading(false);
    }
  };

  // Handle section delete confirmation
  const handleSectionDeleteConfirm = async () => {
    const sectionId = deleteSectionDialog.sectionId;
    if (!sectionId) return;

    try {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete section");
      }

      toast.success("Section deleted successfully");
      setDeleteSectionDialog({ open: false, sectionId: null, sectionTitle: "" });
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete section");
    }
  };

  // Handle publish/unpublish toggle
  const handlePublishToggle = async (publish: boolean) => {
    setPublishToggleLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspaceId}/publish`, {
        method: publish ? "POST" : "DELETE",
      });

      if (!response.ok) {
        throw new Error(publish ? "Failed to publish workspace" : "Failed to unpublish workspace");
      }

      setIsPublished(publish);
      toast.success(publish ? "Workspace published - notifications enabled" : "Workspace unpublished - notifications paused");
      router.refresh();
    } catch (error) {
      toast.error(publish ? "Failed to publish workspace" : "Failed to unpublish workspace");
    } finally {
      setPublishToggleLoading(false);
    }
  };

  // Workspace header data
  const workspaceHeader = {
    name: workspace.name,
    badge: !isPublished ? (
      <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
        Draft
      </Badge>
    ) : undefined,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      avatarUrl: undefined,
    })),
    totalMembers: members.length,
    onMembersClick: handleMembersClick,
    onMoreClick: () => {
      // Close right panel sheet first to prevent z-index overlap on mobile
      setRightPanelOpen(false);
      setShowWorkspaceMenu(true);
    },
    actions: <NotificationsTrigger />,
  };

  return (
    <>
    {/* Real-time workspace event subscriptions */}
    <RealtimeWorkspaceEvents
      workspaceId={currentWorkspaceId}
      onWorkspaceUpdate={() => router.refresh()}
    />

    {/* Draft mode banner */}
    {!isPublished && currentUserRole === "manager" && (
      <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-yellow-700">
            <strong>Draft Mode</strong> - Invitations are queued. They will be sent when you publish.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePublishToggle(true)}
            disabled={publishToggleLoading}
            className="ml-4 bg-white hover:bg-yellow-100 border-yellow-300"
          >
            Publish Workspace
          </Button>
        </AlertDescription>
      </Alert>
    )}

    <MoxoLayout
      sidebar={
        <WorkspaceSidebar
          workspaces={sidebarWorkspaces}
          selectedWorkspaceId={currentWorkspaceId}
          onWorkspaceSelect={handleWorkspaceSelect}
          onCreateWorkspace={currentUserRole === "manager" ? () => setCreateWorkspaceDialogOpen(true) : undefined}
          onHomeClick={() => router.push("/workspaces")}
          footer={<UserMenu />}
        />
      }
      flowContent={
        <FlowView
          sections={flowSections}
          selectedTaskId={selectedTaskId || undefined}
          recentlyCompletedTaskId={recentlyCompletedTaskId || undefined}
          onTaskSelect={handleTaskSelect}
          onTaskReview={handleTaskSelect}
          onAddTask={currentUserRole === "manager" ? handleAddTask : undefined}
          onTaskReorder={currentUserRole === "manager" ? handleTaskReorder : undefined}
          onSectionReorder={currentUserRole === "manager" ? handleSectionReorder : undefined}
          onSectionDelete={currentUserRole === "manager" ? handleSectionDeleteRequest : undefined}
          onSectionEdit={currentUserRole === "manager" ? handleSectionEditRequest : undefined}
          enableDragAndDrop={currentUserRole === "manager"}
          showTimeline={true}
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
          onUpload={(folderId) => {
            setUploadFolderId(folderId);
            setUploadDialogOpen(true);
          }}
          onFolderCreated={(folder) => {
            // Add new folder to state without full page reload
            setWorkspaceFiles((prev) => [{
              id: folder.id,
              name: folder.name,
              type: "folder" as const,
              mimeType: folder.mimeType,
            }, ...prev]);
          }}
          onFileDeleted={(fileId) => {
            // Remove file from state without full page reload
            setWorkspaceFiles((prev) => prev.filter((f) => f.id !== fileId));
          }}
        />
      }
      rightPanel={
        showMembersPanel ? (
          <MembersPanel
            workspaceId={currentWorkspaceId}
            onClose={() => setShowMembersPanel(false)}
            currentUserRole={currentUserRole}
            isWorkspacePublished={isPublished}
          />
        ) : showMeetingsPanel ? (
          <MeetingsPanel
            workspaceId={currentWorkspaceId}
            onClose={() => setShowMeetingsPanel(false)}
          />
        ) : selectedTask ? (
          <TaskDetailsPanel
            task={selectedTask}
            workspaceId={currentWorkspaceId}
            currentUserId={currentUserId}
            onClose={() => setSelectedTaskId(null)}
            onTaskComplete={(wasCompleted?: boolean) => {
              router.refresh();
              // If the task was just completed, auto-close panel and show green highlight
              if (wasCompleted && selectedTaskId) {
                const completedId = selectedTaskId;
                // Close panel after brief delay for feedback
                setTimeout(() => {
                  setSelectedTaskId(null);
                  setRecentlyCompletedTaskId(completedId);
                }, 500);
                // Clear highlight after animation
                setTimeout(() => {
                  setRecentlyCompletedTaskId(null);
                }, 3500);
              }
            }}
            onTaskDelete={() => {
              setSelectedTaskId(null);
              router.refresh();
            }}
            isAdmin={currentUserRole === "manager"}
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
      rightPanelTitle={showMembersPanel ? "Members" : showMeetingsPanel ? "Meetings" : selectedTask ? selectedTask.title : "Chat"}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      rightPanelOpen={rightPanelOpen}
      onRightPanelOpenChange={setRightPanelOpen}
    />

    {/* Add Task Dialog */}
    <AddTaskDialog
      open={addTaskDialogOpen}
      onOpenChange={setAddTaskDialogOpen}
      sections={(workspace.sections || []).map(s => ({
        id: s.id,
        title: s.title,
        tasks: s.tasks.map(t => ({
          id: t.id,
          title: t.title,
          type: t.type,
          position: t.position,
          isCompleted: t.isCompleted,
          isLocked: t.isLocked,
        })),
      }))}
      members={members}
      pendingInvitations={pendingInvitations}
      onTaskCreated={() => router.refresh()}
      workspaceId={currentWorkspaceId}
    />

    {/* Add Section Dialog */}
    <AddSectionDialog
      open={addSectionDialogOpen}
      onOpenChange={setAddSectionDialogOpen}
      workspaceId={currentWorkspaceId}
      sections={(workspace.sections || []).map((s, index) => ({
        id: s.id,
        title: s.title,
        position: index,
        taskCount: s.tasks?.length || 0,
      }))}
      onSectionCreated={(sectionId) => {
        if (sectionId) {
          setScrollToSectionId(sectionId);
        }
        router.refresh();
      }}
    />

    {/* Create Workspace Dialog */}
    <CreateWorkspaceDialog
      open={createWorkspaceDialogOpen}
      onOpenChange={setCreateWorkspaceDialogOpen}
      userId={currentUserId}
    />

    {/* Upload Dialog */}
    <UploadDialog
      open={uploadDialogOpen}
      onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) setUploadFolderId(null);
      }}
      workspaceId={currentWorkspaceId}
      folderId={uploadFolderId}
      onUploadComplete={(uploadedFiles) => {
        // Only add to root file list if uploaded to root folder
        if (!uploadFolderId) {
          const newFiles: FileItem[] = uploadedFiles.map((f) => ({
            id: f.id,
            name: f.name,
            type: "file" as const,
            mimeType: f.mimeType,
            size: f.size,
            uploadedAt: new Date(),
          }));
          setWorkspaceFiles((prev) => [...newFiles, ...prev]);
        }
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
      <SheetContent side="right" className="w-[320px] sm:w-[360px]">
        <SheetHeader>
          <SheetTitle>Workspace Menu</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {currentUserRole === "manager" && (
            <>
              <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-md hover:bg-muted/50">
                <Label htmlFor="publish-toggle" className="text-sm font-medium cursor-pointer">
                  {isPublished ? "Published" : "Draft Mode"}
                </Label>
                <Switch
                  id="publish-toggle"
                  checked={isPublished}
                  onCheckedChange={handlePublishToggle}
                  disabled={publishToggleLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground px-3 -mx-3 pb-3">
                {isPublished
                  ? "Users will receive notifications"
                  : "Notifications paused while setting up"}
              </p>
              <div className="-mx-6 border-t" />
              <div className="pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-11 px-3 -mx-3"
                  onClick={() => {
                    setShowWorkspaceMenu(false);
                    setAddSectionDialogOpen(true);
                  }}
                >
                  <FolderPlus className="mr-3 h-4 w-4" />
                  Add Section
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-11 px-3 -mx-3"
                  onClick={() => {
                    setShowWorkspaceMenu(false);
                    handleAddTaskFromMenu();
                  }}
                >
                  <Plus className="mr-3 h-4 w-4" />
                  Add New Action
                </Button>
              </div>
              <div className="-mx-6 border-t" />
              <div className="pt-2" />
            </>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start h-11 px-3 -mx-3"
            onClick={() => {
              setShowWorkspaceMenu(false);
              handleMembersClick();
            }}
          >
            <Users className="mr-3 h-4 w-4" />
            Members
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-11 px-3 -mx-3"
            onClick={() => {
              setShowWorkspaceMenu(false);
              handleMeetingsClick();
            }}
          >
            <Calendar className="mr-3 h-4 w-4" />
            Meetings
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    {/* Edit Section Dialog */}
    <Dialog
      open={editSectionDialog.open}
      onOpenChange={(open) =>
        setEditSectionDialog((prev) => ({ ...prev, open }))
      }
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>
            Change the name of this section
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="sectionTitle">Section Name</Label>
          <Input
            id="sectionTitle"
            value={editSectionDialog.sectionTitle}
            onChange={(e) =>
              setEditSectionDialog((prev) => ({
                ...prev,
                sectionTitle: e.target.value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && editSectionDialog.sectionTitle.trim()) {
                e.preventDefault();
                handleSectionEditConfirm();
              }
            }}
            disabled={editSectionLoading}
            className="mt-2"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditSectionDialog({ open: false, sectionId: null, sectionTitle: "" })}
            disabled={editSectionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSectionEditConfirm}
            disabled={editSectionLoading || !editSectionDialog.sectionTitle.trim()}
          >
            {editSectionLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Section Confirmation Dialog */}
    <AlertDialog
      open={deleteSectionDialog.open}
      onOpenChange={(open) =>
        setDeleteSectionDialog((prev) => ({ ...prev, open }))
      }
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Section</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{deleteSectionDialog.sectionTitle}&quot;?
            This will also delete all tasks within this section. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSectionDeleteConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
