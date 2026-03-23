"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design/components/ui/table";
import { Button } from "@repo/design/components/ui/button";
import { Badge } from "@repo/design/components/ui/badge";
import { Card, CardContent, CardHeader } from "@repo/design/components/ui/card";
import { Input } from "@repo/design/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import { Checkbox } from "@repo/design/components/ui/checkbox";
import { Label } from "@repo/design/components/ui/label";
import { Eye, SearchIcon, Loader2, MoreHorizontal, CheckCircle, Pencil, ChevronDown, ChevronRight, User, Clock } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design/components/ui/collapsible";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  workspaceId: string;
  workspaceName: string;
  sectionId: string;
  sectionTitle: string;
  assigneeCount: number;
  dueDateValue: string | null;
  createdAt: string;
}

interface Assignee {
  id: string;
  userId: string;
  status: string;
  completedAt: string | null;
  name: string;
  email: string;
}

const taskTypeLabels: Record<string, string> = {
  FORM: "Form",
  ACKNOWLEDGEMENT: "Acknowledgement",
  TIME_BOOKING: "Time Booking",
  E_SIGN: "E-Sign",
  FILE_REQUEST: "File Request",
  APPROVAL: "Approval",
};

const taskTypeColors: Record<string, string> = {
  FORM: "bg-blue-100 text-blue-800",
  ACKNOWLEDGEMENT: "bg-purple-100 text-purple-800",
  TIME_BOOKING: "bg-orange-100 text-orange-800",
  E_SIGN: "bg-green-100 text-green-800",
  FILE_REQUEST: "bg-yellow-100 text-yellow-800",
  APPROVAL: "bg-red-100 text-red-800",
};

const statusColors: Record<string, "default" | "secondary" | "outline"> = {
  not_started: "outline",
  in_progress: "secondary",
  completed: "default",
};

export const TaskList = () => {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Complete task dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [bypassDependencies, setBypassDependencies] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Expandable assignee rows state
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [taskAssignees, setTaskAssignees] = useState<Record<string, Assignee[]>>({});
  const [loadingTaskAssignees, setLoadingTaskAssignees] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/admin/tasks", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch tasks");

        const result = await response.json();
        setTasks(result.data || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  let filteredData = tasks;

  if (searchValue) {
    filteredData = filteredData.filter(
      (task) =>
        task.title?.toLowerCase().includes(searchValue.toLowerCase()) ||
        task.workspaceName?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }

  if (statusFilter) {
    filteredData = filteredData.filter((task) => task.status === statusFilter);
  }

  if (typeFilter) {
    filteredData = filteredData.filter((task) => task.type === typeFilter);
  }

  const openCompleteDialog = async (task: Task) => {
    setSelectedTask(task);
    setSelectedUserId("");
    setBypassDependencies(false);
    setCompleteDialogOpen(true);
    setLoadingAssignees(true);

    try {
      const response = await fetch(`/api/admin/tasks/${task.id}/assignees`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch assignees");

      const result = await response.json();
      setAssignees(result.data || []);
    } catch (error) {
      console.error("Error fetching assignees:", error);
      toast.error("Failed to load assignees");
    } finally {
      setLoadingAssignees(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedTask) return;

    setCompleting(true);
    try {
      const response = await fetch(`/api/admin/tasks/${selectedTask.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: selectedUserId || undefined,
          bypassDependencies,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete task");
      }

      // Update task in list
      if (result.taskCompleted) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === selectedTask.id ? { ...t, status: "completed" } : t
          )
        );
      }

      toast.success(result.message || "Task completed successfully");
      setCompleteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete task");
    } finally {
      setCompleting(false);
    }
  };

  const toggleTaskExpanded = async (taskId: string) => {
    const newExpanded = new Set(expandedTasks);

    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
      setExpandedTasks(newExpanded);
      return;
    }

    newExpanded.add(taskId);
    setExpandedTasks(newExpanded);

    // Fetch assignees if not already loaded
    if (!taskAssignees[taskId] && !loadingTaskAssignees.has(taskId)) {
      setLoadingTaskAssignees((prev) => new Set(prev).add(taskId));

      try {
        const response = await fetch(`/api/admin/tasks/${taskId}/assignees`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch assignees");

        const result = await response.json();
        setTaskAssignees((prev) => ({ ...prev, [taskId]: result.data || [] }));
      } catch (error) {
        console.error("Error fetching assignees:", error);
        toast.error("Failed to load assignees");
      } finally {
        setLoadingTaskAssignees((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all tasks across all workspaces
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="FORM">Form</SelectItem>
                <SelectItem value="ACKNOWLEDGEMENT">Acknowledgement</SelectItem>
                <SelectItem value="TIME_BOOKING">Time Booking</SelectItem>
                <SelectItem value="E_SIGN">E-Sign</SelectItem>
                <SelectItem value="FILE_REQUEST">File Request</SelectItem>
                <SelectItem value="APPROVAL">Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading tasks...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">Title</TableHead>
                  <TableHead className="w-[10%]">Type</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[18%]">Workspace</TableHead>
                  <TableHead className="w-[15%]">Section</TableHead>
                  <TableHead className="w-[8%]">Assignees</TableHead>
                  <TableHead className="w-[10%]">Due Date</TableHead>
                  <TableHead className="w-[9%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredData || filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((task) => {
                    const isExpanded = expandedTasks.has(task.id);
                    const taskAssigneeList = taskAssignees[task.id] || [];
                    const isLoadingAssignees = loadingTaskAssignees.has(task.id);
                    const completedCount = taskAssigneeList.filter((a) => a.status === "completed").length;

                    return (
                      <Collapsible key={task.id} open={isExpanded} onOpenChange={() => toggleTaskExpanded(task.id)} asChild>
                        <>
                          <TableRow className={isExpanded ? "border-b-0" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <div className="font-medium max-w-xs truncate">{task.title}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${taskTypeColors[task.type] || "bg-gray-100"}`}>
                                {taskTypeLabels[task.type] || task.type}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusColors[task.status] || "outline"}>
                                {task.status?.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{task.workspaceName}</TableCell>
                            <TableCell className="max-w-xs truncate">{task.sectionTitle}</TableCell>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-sm hover:bg-muted">
                                  {task.assigneeCount}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              {task.dueDateValue
                                ? new Date(task.dueDateValue).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.location.href = `/workspace/${task.workspaceId}`;
                                  }}
                                  title="View Workspace"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        window.location.href = `/dashboard/tasks/${task.id}`;
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openCompleteDialog(task)}
                                      disabled={task.status === "completed"}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Complete Task
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30 hover:bg-muted/40">
                              <TableCell colSpan={8} className="py-3">
                                <div className="pl-8">
                                  {isLoadingAssignees ? (
                                    <div className="flex items-center gap-2 py-2">
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">Loading assignees...</span>
                                    </div>
                                  ) : taskAssigneeList.length === 0 ? (
                                    <div className="text-sm text-muted-foreground py-2">
                                      No assignees for this task
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                        <span className="font-medium">Assignee Progress:</span>
                                        <span>{completedCount} of {taskAssigneeList.length} completed</span>
                                      </div>
                                      <div className="grid gap-2">
                                        {taskAssigneeList.map((assignee) => (
                                          <div
                                            key={assignee.userId}
                                            className="flex items-center justify-between p-3 bg-background rounded-lg border"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                <User className="h-4 w-4 text-primary" />
                                              </div>
                                              <div>
                                                <div className="font-medium text-sm">{assignee.name}</div>
                                                <div className="text-xs text-muted-foreground">{assignee.email}</div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              {assignee.status === "completed" ? (
                                                <>
                                                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                    Completed
                                                  </Badge>
                                                  {assignee.completedAt && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                      <Clock className="h-3 w-3" />
                                                      {new Date(assignee.completedAt).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                      })}
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                                  Pending
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Mark &quot;{selectedTask?.title}&quot; as complete. Choose to complete for a specific user or mark the entire task as complete.
            </DialogDescription>
          </DialogHeader>

          {loadingAssignees ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading assignees...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {assignees.length > 0 && (
                <div className="space-y-2">
                  <Label>Complete for user (optional)</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All assignees (system completion)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All assignees (system completion)</SelectItem>
                      {assignees.map((assignee) => (
                        <SelectItem
                          key={assignee.userId}
                          value={assignee.userId}
                          disabled={assignee.status === "completed"}
                        >
                          {assignee.name} ({assignee.email})
                          {assignee.status === "completed" && " - Completed"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bypass"
                  checked={bypassDependencies}
                  onCheckedChange={(checked) => setBypassDependencies(checked as boolean)}
                />
                <Label htmlFor="bypass" className="text-sm">
                  Bypass dependency checks (complete even if locked)
                </Label>
              </div>

              {assignees.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No assignees found for this task. The task will be completed via system completion.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completing}
            >
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={completing || loadingAssignees}>
              {completing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
