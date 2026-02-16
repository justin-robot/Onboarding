"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { TaskAction } from "./task-actions";
import { TaskConfigDialog } from "./task-config-dialog";
import { Button } from "@repo/design/components/ui/button";
import { Badge } from "@repo/design/components/ui/badge";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/components/ui/tabs";
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
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
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
import { DueDateSelector } from "./due-date-selector";

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
  onTaskComplete: () => void;
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
  const [fileInfo, setFileInfo] = useState<{ name: string; url?: string } | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Check if this task type needs configuration
  const needsConfiguration = () => {
    if (loading || !isAdmin) return false;

    switch (task.type) {
      case "booking":
        // TIME_BOOKING needs a booking link
        return !config || !(config as TimeBookingConfig).bookingLink;
      case "esign":
        // E_SIGN needs fileId and signerEmail
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
    // Refetch task details to get updated config
    setLoading(true);
    fetch(`/api/tasks/${task.id}`)
      .then((res) => res.json())
      .then((data) => {
        setConfig(data.config);
        onTaskComplete(); // Refresh the parent view
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

        // If this is an e-sign task with a fileId, fetch file info
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

  // Fetch assignees and members
  useEffect(() => {
    const fetchAssigneesAndMembers = async () => {
      try {
        // Fetch assignees
        const assigneesRes = await fetch(`/api/tasks/${task.id}/assignees`);
        if (assigneesRes.ok) {
          const data = await assigneesRes.json();
          setAssignees(data.assignees || []);
        }

        // Fetch workspace members (for admin dropdown)
        if (isAdmin) {
          const membersRes = await fetch(`/api/workspaces/${workspaceId}/members`);
          if (membersRes.ok) {
            const data = await membersRes.json();
            // API returns array directly, not { members: [...] }
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

      // Find member info to add to assignees list
      const member = members.find(m => m.userId === userId);
      setAssignees(prev => [...prev, {
        ...data.assignee,
        userName: member?.name,
        userEmail: member?.email,
      }]);

      toast.success("User assigned to task");
      onTaskComplete(); // Refresh parent
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
      onTaskComplete(); // Refresh parent
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconColor)} />
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground truncate">{task.title}</h2>
              <p className="text-xs text-muted-foreground capitalize">{task.type.replace("_", " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {task.isYourTurn && !task.isCompleted && (
              <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs">
                Your Turn
              </Badge>
            )}
            {task.isCompleted && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                Complete
              </Badge>
            )}
            {isAdmin && isConfigurable() && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  needsConfiguration()
                    ? "text-amber-500 hover:text-amber-600"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setConfigDialogOpen(true)}
                title={needsConfiguration() ? "Configuration required" : "Configure task"}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
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
                      onClick={handleDelete}
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
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content area with tabs */}
      <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex-shrink-0 w-full justify-start rounded-none border-b bg-transparent px-4">
          <TabsTrigger value="details" className="text-xs">
            Details
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            Comments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Description */}
              {task.description && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-foreground">{task.description}</p>
                </div>
              )}

              {/* Assignees */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  <Users className="inline h-3 w-3 mr-1" />
                  Assignees
                </h3>

                {assignees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No one assigned</p>
                ) : (
                  <div className="space-y-2">
                    {assignees.map((assignee) => (
                      <div
                        key={assignee.id || assignee.userId}
                        className="flex items-center justify-between gap-2 rounded-md border p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {(assignee.userName || assignee.userEmail || "?")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {assignee.userName || assignee.userEmail || "Unknown"}
                            </p>
                            {assignee.status === "completed" && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
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

              {/* Due date */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Due Date
                </h3>
                {isAdmin ? (
                  <DueDateSelector
                    taskId={task.id}
                    currentDueDate={task.dueDate}
                    dueDateType={task.dueDateType}
                    onDueDateChange={onTaskComplete}
                    disabled={loading}
                  />
                ) : task.dueDate ? (
                  <p className="text-sm text-foreground">
                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No due date set</p>
                )}
              </div>

              {/* Task action area */}
              <div className="pt-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  Action
                </h3>
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
                    instructions={task.description || undefined}
                    onComplete={onTaskComplete}
                    {...getConfigProps()}
                  />
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="comments" className="flex-1 mt-0 overflow-hidden">
          <CommentSection
            taskId={task.id}
            currentUserId={currentUserId}
            className="h-full"
          />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
