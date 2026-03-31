"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import { Button } from "@repo/design/components/ui/button";
import { Checkbox } from "@repo/design/components/ui/checkbox";
import { Badge } from "@repo/design/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design/components/ui/collapsible";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

interface AddToTaskDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function formatTaskType(type: string) {
  const typeMap: Record<string, string> = {
    FORM: "Form",
    ACKNOWLEDGEMENT: "Acknowledgement",
    TIME_BOOKING: "Booking",
    E_SIGN: "E-Sign",
    FILE_REQUEST: "File Request",
    APPROVAL: "Approval",
  };
  return typeMap[type] || type;
}

export const AddToTaskDialog = ({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: AddToTaskDialogProps) => {
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSelectedTaskIds(new Set());
      fetch(`/api/admin/users/${userId}/available-tasks`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          const groups = data.data || [];
          setTaskGroups(groups);
          // Expand all workspaces by default
          setExpandedWorkspaces(new Set(groups.map((g: TaskGroup) => g.workspaceId)));
        })
        .catch(() => {
          toast.error("Failed to load tasks");
          setTaskGroups([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open, userId]);

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  };

  const handleAdd = async () => {
    if (selectedTaskIds.size === 0) {
      toast.error("Please select at least one task");
      return;
    }

    setAdding(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const taskId of selectedTaskIds) {
        try {
          const response = await fetch(`/api/admin/users/${userId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ taskId }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Assigned user to ${successCount} task(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to assign ${errorCount} task(s)`);
      }

      onOpenChange(false);
      onSuccess?.();
    } finally {
      setAdding(false);
    }
  };

  const totalTasks = taskGroups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign to Tasks</DialogTitle>
          <DialogDescription>
            Select tasks to assign this user to. Only tasks in workspaces the
            user is a member of are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading tasks...
              </span>
            </div>
          ) : totalTasks === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No available tasks to assign. The user may already be assigned to
              all tasks in their workspaces.
            </div>
          ) : (
            <div className="space-y-2">
              {taskGroups.map((group) => (
                <Collapsible
                  key={group.workspaceId}
                  open={expandedWorkspaces.has(group.workspaceId)}
                  onOpenChange={() => toggleWorkspace(group.workspaceId)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-medium"
                    >
                      {expandedWorkspaces.has(group.workspaceId) ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      {group.workspaceName}
                      <Badge variant="secondary" className="ml-2">
                        {group.tasks.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1">
                    {group.tasks.map((task) => (
                      <div
                        key={task.taskId}
                        className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleTask(task.taskId)}
                      >
                        <Checkbox
                          checked={selectedTaskIds.has(task.taskId)}
                          onCheckedChange={() => toggleTask(task.taskId)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {task.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {task.sectionTitle}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {formatTaskType(task.type)}
                        </Badge>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {selectedTaskIds.size} task(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={adding}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={adding || loading || selectedTaskIds.size === 0}
              >
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign to Tasks
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
