"use client";

import { useEffect, useState } from "react";
import { TaskAction } from "./task-actions";
import { TaskConfigDialog } from "./task-config-dialog";
import { Button } from "@repo/design/components/ui/button";
import { Badge } from "@repo/design/components/ui/badge";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import {
  Loader2,
  X,
  FileText,
  CheckSquare,
  Upload,
  Calendar,
  FileSignature,
  ThumbsUp,
  Trash2,
  Settings,
  UserPlus,
  MoreHorizontal,
  Download,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { formatFullTimestamp } from "@repo/design/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import { Avatar, AvatarFallback } from "@repo/design/components/ui/avatar";
import { cn } from "@repo/design/lib/utils";
import { toast } from "sonner";
import { CommentSection } from "./comment-section";
import { TaskDependencies } from "./task-dependencies";
import { DueDateSelector } from "./due-date-selector";
import { DueDateDisplay } from "./due-date-display";

interface Assignee {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: string;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  type: "form" | "acknowledgement" | "file_upload" | "approval" | "booking" | "esign";
  position: number;
  isYourTurn: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  description: string | null;
  dueDate?: string;
  dueDateType?: "absolute" | "relative";
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

// Config types for each task type
interface FormConfig {
  id: string;
  taskId: string;
}

interface AcknowledgementConfig {
  id: string;
  taskId: string;
  instructions: string | null;
}

interface ESignConfig {
  id: string;
  taskId: string;
  fileId: string | null;
  signerEmail: string | null;
  provider: string;
  status: string;
}

interface FileRequestConfig {
  id: string;
  taskId: string;
  targetFolderId: string | null;
}

interface ApprovalConfig {
  id: string;
  taskId: string;
}

interface TimeBookingConfig {
  id: string;
  taskId: string;
  bookingLink: string | null;
}

type TaskConfig = FormConfig | AcknowledgementConfig | ESignConfig | FileRequestConfig | ApprovalConfig | TimeBookingConfig | null;

interface TaskDetailsPanelProps {
  task: Task;
  workspaceId: string;
  currentUserId: string;
  onClose: () => void;
  onTaskComplete: (wasCompleted?: boolean) => void;
  onTaskDelete?: () => void;
  isAdmin?: boolean;
}

export function TaskDetailsPanel({
  task,
  workspaceId,
  currentUserId,
  onClose,
  onTaskComplete,
  onTaskDelete,
  isAdmin,
}: TaskDetailsPanelProps) {
  const [config, setConfig] = useState<TaskConfig>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [prerequisitesDialogOpen, setPrerequisitesDialogOpen] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; url?: string } | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  // For viewing a specific assignee's form submission (admin only)
  const [viewingSubmissionUserId, setViewingSubmissionUserId] = useState<string | null>(null);
  // Blocking tasks (prerequisites that must be completed)
  const [blockingTasks, setBlockingTasks] = useState<Array<{ id: string; title: string; status: string }>>([]);

  // Check if this task type needs configuration
  const needsConfiguration = () => {
    if (loading || !isAdmin) return false;

    switch (task.type) {
      case "booking":
        return !config || !(config as TimeBookingConfig).bookingLink;
      case "esign":
        if (!config) return true;
        const esignConfig = config as ESignConfig;
        return !esignConfig.fileId || !esignConfig.signerEmail;
      default:
        return false;
    }
  };

  // Check if this task type is configurable
  const isConfigurable = () => {
    return ["booking", "esign", "acknowledgement"].includes(task.type);
  };

  // Get existing config for the dialog
  const getExistingConfig = () => {
    if (!config) return null;
    switch (task.type) {
      case "booking":
        return { bookingLink: (config as TimeBookingConfig).bookingLink };
      case "esign":
        const esignConfig = config as ESignConfig;
        return { fileId: esignConfig.fileId, signerEmail: esignConfig.signerEmail };
      case "acknowledgement":
        return { instructions: (config as AcknowledgementConfig).instructions };
      default:
        return null;
    }
  };

  const handleConfigSaved = () => {
    setLoading(true);
    fetch(`/api/tasks/${task.id}`)
      .then((res) => res.json())
      .then((data) => {
        setConfig(data.config);
        onTaskComplete();
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      toast.success("Task deleted successfully");
      setDeleteDialogOpen(false);
      onTaskDelete?.();
      onClose();
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch task details with config when task changes
  useEffect(() => {
    const fetchTaskDetails = async () => {
      setLoading(true);
      setError(null);
      setFileInfo(null);
      try {
        const response = await fetch(`/api/tasks/${task.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch task details");
        }
        const data = await response.json();
        setConfig(data.config);

        if (task.type === "esign" && data.config?.fileId) {
          try {
            const fileResponse = await fetch(`/api/files/${data.config.fileId}`);
            if (fileResponse.ok) {
              const fileData = await fileResponse.json();
              setFileInfo({
                name: fileData.name,
                url: fileData.url,
              });
            }
          } catch (fileErr) {
            console.error("Error fetching file info:", fileErr);
          }
        }
      } catch (err) {
        console.error("Error fetching task details:", err);
        setError("Failed to load task details");
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [task.id, task.type]);

  // Reset viewing submission state when task changes
  useEffect(() => {
    setViewingSubmissionUserId(null);
  }, [task.id]);

  // Fetch blocking tasks when task is locked
  useEffect(() => {
    const fetchBlockingTasks = async () => {
      if (!task.isLocked) {
        setBlockingTasks([]);
        return;
      }

      try {
        const response = await fetch(`/api/tasks/${task.id}/blocking`);
        if (response.ok) {
          const data = await response.json();
          setBlockingTasks(data.blockingTasks || []);
        }
      } catch (err) {
        console.error("Error fetching blocking tasks:", err);
      }
    };

    fetchBlockingTasks();
  }, [task.id, task.isLocked]);

  // Fetch assignees and members
  useEffect(() => {
    const fetchAssigneesAndMembers = async () => {
      try {
        const assigneesRes = await fetch(`/api/tasks/${task.id}/assignees`);
        if (assigneesRes.ok) {
          const data = await assigneesRes.json();
          setAssignees(data.assignees || []);
        }

        if (isAdmin) {
          const membersRes = await fetch(`/api/workspaces/${workspaceId}/members`);
          if (membersRes.ok) {
            const data = await membersRes.json();
            setMembers(Array.isArray(data) ? data : (data.members || []));
          }
        }
      } catch (err) {
        console.error("Error fetching assignees/members:", err);
      }
    };

    fetchAssigneesAndMembers();
  }, [task.id, workspaceId, isAdmin]);

  // Handle assigning a user
  const handleAssign = async (userId: string) => {
    setIsAssigning(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign user");
      }

      const data = await response.json();
      const member = members.find(m => m.userId === userId);
      setAssignees(prev => [...prev, {
        ...data.assignee,
        userName: member?.name,
        userEmail: member?.email,
      }]);

      toast.success("User assigned to task");
      onTaskComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign user");
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle unassigning a user
  const handleUnassign = async (userId: string) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/assignees/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to unassign user (${response.status})`);
      }

      setAssignees(prev => prev.filter(a => a.userId !== userId));
      toast.success("User removed from task");
      onTaskComplete();
    } catch (err) {
      console.error("Unassign error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to unassign user");
    }
  };

  // Get members not yet assigned
  const availableMembers = members.filter(
    m => !assignees.some(a => a.userId === m.userId)
  );

  // Extract config-specific props based on task type
  const getConfigProps = () => {
    if (!config) return {};

    switch (task.type) {
      case "form":
        return { formConfigId: (config as FormConfig).id };
      case "acknowledgement":
        return { instructions: (config as AcknowledgementConfig).instructions || task.description || undefined };
      case "booking": {
        const bookingConfig = config as TimeBookingConfig;
        return {
          bookingLink: bookingConfig.bookingLink || undefined,
        };
      }
      case "esign": {
        const esignConfig = config as ESignConfig;
        return {
          documentName: fileInfo?.name || (esignConfig.fileId ? "Document" : undefined),
          documentUrl: fileInfo?.url,
          signerEmail: esignConfig.signerEmail || undefined,
        };
      }
      default:
        return {};
    }
  };

  // Type-specific icons
  const typeIcons = {
    form: FileText,
    acknowledgement: CheckSquare,
    file_upload: Upload,
    approval: ThumbsUp,
    booking: Calendar,
    esign: FileSignature,
  };

  const typeColors = {
    form: "text-teal-600",
    acknowledgement: "text-amber-600",
    file_upload: "text-purple-600",
    approval: "text-blue-600",
    booking: "text-orange-600",
    esign: "text-indigo-600",
  };

  const Icon = typeIcons[task.type];
  const iconColor = typeColors[task.type];

  // Get completed assignee info for form response display
  const completedAssignee = assignees.find(a => a.status === "completed");
  const currentUserCompleted = assignees.find(a => a.userId === currentUserId)?.status === "completed";

  // Progress status
  const progressStatus = task.isCompleted
    ? "Completed"
    : assignees.some(a => a.status === "completed")
    ? "In Progress"
    : "Pending";

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header - "Action Details (Step X)" style */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            Action Details (Step {task.position})
          </h2>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isConfigurable() && (
                    <DropdownMenuItem onClick={() => setConfigDialogOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setPrerequisitesDialogOpen(true)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Prerequisites
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        {/* Sticky task title header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-md bg-muted/50", iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{task.title}</h3>
              <p className="text-xs text-muted-foreground capitalize">{task.type.replace("_", " ")}</p>
            </div>
          </div>
          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
          )}
        </div>

        <div className="p-4">

          {/* Due Date Section */}
          <div className="mb-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Due Date
            </h4>
            {isAdmin ? (
              <DueDateSelector
                taskId={task.id}
                currentDueDate={task.dueDate}
                dueDateType={task.dueDateType}
                onDueDateChange={onTaskComplete}
                disabled={task.isCompleted}
              />
            ) : (
              <DueDateDisplay
                dueDate={task.dueDate}
                dueDateType={task.dueDateType}
                isCompleted={task.isCompleted}
              />
            )}
          </div>

          {/* Form Response Section - compact clickable row */}
          {task.type === "form" && config && (task.isCompleted || currentUserCompleted || viewingSubmissionUserId) && (
            <div className="mb-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Form Response
              </h4>
              {viewingSubmissionUserId ? (
                // When viewing a specific submission (admin), show inline viewer
                <TaskAction
                  taskId={task.id}
                  type={task.type}
                  isYourTurn={task.isYourTurn}
                  isCompleted={task.isCompleted}
                  isLocked={task.isLocked}
                  isAdmin={isAdmin}
                  currentUserCompleted={currentUserCompleted}
                  viewingUserId={viewingSubmissionUserId}
                  viewingUserName={assignees.find(a => a.userId === viewingSubmissionUserId)?.userName}
                  onClearViewing={() => setViewingSubmissionUserId(null)}
                  instructions={task.description || undefined}
                  blockingTasks={blockingTasks}
                  onComplete={onTaskComplete}
                  {...getConfigProps()}
                />
              ) : (
                // Compact row with "View Form" link
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    if (currentUserCompleted) {
                      // View own submission inline
                      setViewingSubmissionUserId(currentUserId);
                    } else if (completedAssignee) {
                      // Admin viewing another's submission
                      setViewingSubmissionUserId(completedAssignee.userId);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">View Form</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted by {completedAssignee?.userName || completedAssignee?.userEmail || "User"}
                      </p>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Uploaded Files Section - for file_upload tasks (consistent with Form Response) */}
          {task.type === "file_upload" && task.isCompleted && (
            <div className="mb-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Uploaded Files
              </h4>
              <TaskAction
                taskId={task.id}
                type={task.type}
                isYourTurn={task.isYourTurn}
                isCompleted={task.isCompleted}
                isLocked={task.isLocked}
                isAdmin={isAdmin}
                currentUserCompleted={currentUserCompleted}
                instructions={task.description || undefined}
                blockingTasks={blockingTasks}
                onComplete={onTaskComplete}
                {...getConfigProps()}
              />
            </div>
          )}


          {/* Progress Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Progress
              </h4>
              <span className={cn(
                "text-sm font-medium",
                task.isCompleted ? "text-green-600" : "text-muted-foreground"
              )}>
                {progressStatus}
              </span>
            </div>

            {assignees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one assigned</p>
            ) : (
              <div className="space-y-2">
                {assignees.map((assignee, index) => (
                  <div
                    key={`${assignee.userId}-${index}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-muted">
                            {(assignee.userName || assignee.userEmail || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {assignee.status === "completed" && (
                          <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-green-500 bg-background rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {assignee.userName || assignee.userEmail || "Unknown"}
                        </p>
                        {assignee.status === "completed" && (
                          <p className="text-xs text-muted-foreground">Completed</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && task.type === "form" && assignee.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary"
                          onClick={() => setViewingSubmissionUserId(assignee.userId)}
                        >
                          View
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnassign(assignee.userId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add assignee dropdown (admin only) */}
            {isAdmin && availableMembers.length > 0 && (
              <div className="mt-2">
                <Select
                  onValueChange={handleAssign}
                  disabled={isAssigning}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isAssigning ? "Assigning..." : "Add assignee..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-3 w-3" />
                          <span>{member.name || member.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Task action area - only show if not showing dedicated section above */}
          {!(task.type === "form" && config && (task.isCompleted || currentUserCompleted || viewingSubmissionUserId)) &&
           !(task.type === "file_upload" && task.isCompleted) && (
            <div className="mb-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
                  {error}
                </div>
              ) : needsConfiguration() ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/30 dark:bg-amber-950/20">
                  <Settings className="mx-auto h-8 w-8 text-amber-500" />
                  <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    Configuration Required
                  </p>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                    {task.type === "booking"
                      ? "Set up a booking link to allow users to schedule meetings"
                      : "Upload a document and specify the signer to enable e-signatures"}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => setConfigDialogOpen(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Now
                  </Button>
                </div>
              ) : (
                <TaskAction
                  taskId={task.id}
                  type={task.type}
                  isYourTurn={task.isYourTurn}
                  isCompleted={task.isCompleted}
                  isLocked={task.isLocked}
                  isAdmin={isAdmin}
                  currentUserCompleted={currentUserCompleted}
                  viewingUserId={viewingSubmissionUserId || undefined}
                  viewingUserName={viewingSubmissionUserId ? assignees.find(a => a.userId === viewingSubmissionUserId)?.userName : undefined}
                  onClearViewing={() => setViewingSubmissionUserId(null)}
                  instructions={task.description || undefined}
                  blockingTasks={blockingTasks}
                  onComplete={onTaskComplete}
                  {...getConfigProps()}
                />
              )}
            </div>
          )}

          {/* Activity / Comments Section - inline like Moxo */}
          <div className="border-t border-border pt-4">
            <CommentSection
              taskId={task.id}
              currentUserId={currentUserId}
              className="h-auto"
              compact
            />
          </div>
        </div>
      </ScrollArea>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Configuration Dialog */}
      {isConfigurable() && (
        <TaskConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          taskId={task.id}
          taskType={task.type}
          taskTitle={task.title}
          existingConfig={getExistingConfig()}
          onConfigSaved={handleConfigSaved}
        />
      )}

      {/* Prerequisites Dialog */}
      <Dialog open={prerequisitesDialogOpen} onOpenChange={setPrerequisitesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prerequisites</DialogTitle>
          </DialogHeader>
          <TaskDependencies
            taskId={task.id}
            isAdmin={isAdmin}
            onDependencyChange={onTaskComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
