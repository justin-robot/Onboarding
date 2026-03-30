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
import { Progress } from "@repo/design/components/ui/progress";
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
  SearchIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
  AlertCircle,
  Copy,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { DuplicateDialog } from "./duplicate-dialog";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  isPublished: boolean;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  progress: number;
  isOverdue: boolean;
  lastActivityAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  daysUntilHardDelete: number | null;
}

export const WorkspaceList = () => {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [saveAsTemplateDialogOpen, setSaveAsTemplateDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await fetch("/api/admin/workspaces?includeDeleted=true", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch workspaces");

        const result = await response.json();
        setWorkspaces(result.data || []);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  let filteredData = workspaces;

  // Apply search filter
  if (searchValue) {
    filteredData = filteredData.filter(
      (workspace) =>
        workspace.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
        workspace.description?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }

  // Apply status filter
  if (statusFilter) {
    filteredData = filteredData.filter((workspace) => {
      if (statusFilter === "draft") return !workspace.deletedAt && !workspace.isPublished;
      if (statusFilter === "active") return !workspace.deletedAt && workspace.isPublished && !workspace.isOverdue && workspace.progress < 100;
      if (statusFilter === "overdue") return !workspace.deletedAt && workspace.isOverdue;
      if (statusFilter === "completed") return !workspace.deletedAt && workspace.progress === 100;
      if (statusFilter === "deleted") return !!workspace.deletedAt;
      return true;
    });
  }

  const handleDelete = async () => {
    if (!selectedWorkspace) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${selectedWorkspace.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete workspace");

      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === selectedWorkspace.id ? { ...w, deletedAt: new Date().toISOString() } : w
        )
      );
      toast.success("Workspace deleted successfully");
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace");
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedWorkspace(null);
    }
  };

  const handleRestore = async () => {
    if (!selectedWorkspace) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${selectedWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "restore" }),
      });
      if (!response.ok) throw new Error("Failed to restore workspace");

      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === selectedWorkspace.id ? { ...w, deletedAt: null } : w
        )
      );
      toast.success("Workspace restored successfully");
    } catch (error) {
      console.error("Error restoring workspace:", error);
      toast.error("Failed to restore workspace");
    } finally {
      setActionLoading(false);
      setRestoreDialogOpen(false);
      setSelectedWorkspace(null);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedWorkspace) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${selectedWorkspace.id}/save-as-template`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save as template");
      }

      // Remove the workspace from the list (it's now a template)
      setWorkspaces((prev) => prev.filter((w) => w.id !== selectedWorkspace.id));
      toast.success("Workspace saved as template! Redirecting to Templates...");

      // Redirect to templates page after a brief delay
      setTimeout(() => {
        router.push("/dashboard/templates");
      }, 1000);
    } catch (error) {
      console.error("Error saving as template:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save as template");
    } finally {
      setActionLoading(false);
      setSaveAsTemplateDialogOpen(false);
      setSelectedWorkspace(null);
    }
  };

  const handleHardDelete = async () => {
    if (!selectedWorkspace) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${selectedWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "hardDelete" }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete workspace permanently");
      }

      // Remove from local state
      setWorkspaces((prev) => prev.filter((w) => w.id !== selectedWorkspace.id));
      toast.success("Workspace permanently deleted");
    } catch (error) {
      console.error("Error hard deleting workspace:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete workspace");
    } finally {
      setActionLoading(false);
      setHardDeleteDialogOpen(false);
      setSelectedWorkspace(null);
    }
  };

  const formatLastActivity = (date: string | null) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusBadge = (workspace: Workspace) => {
    if (workspace.deletedAt) {
      const days = workspace.daysUntilHardDelete;
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="destructive">Deleted</Badge>
          {days !== null && (
            <span className="text-xs text-muted-foreground">
              {days === 0
                ? "Deletes today"
                : days === 1
                  ? "1 day left"
                  : `${days} days left`}
            </span>
          )}
        </div>
      );
    }
    if (workspace.progress === 100) {
      return <Badge variant="default">Completed</Badge>;
    }
    if (workspace.isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }
    if (!workspace.isPublished) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Draft</Badge>;
    }
    return <Badge variant="secondary">Active</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workspaces</h1>
        <p className="text-muted-foreground mt-2">
          Manage all workspaces and track progress
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading workspaces...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Name</TableHead>
                  <TableHead className="w-[10%]">Members</TableHead>
                  <TableHead className="w-[18%]">Progress</TableHead>
                  <TableHead className="w-[12%]">Due Date</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[12%]">Last Activity</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredData || filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No workspaces found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((workspace) => (
                    <TableRow
                      key={workspace.id}
                      className={`${workspace.deletedAt ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}`}
                      onClick={() => {
                        if (!workspace.deletedAt) {
                          router.push(`/workspace/${workspace.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{workspace.name}</div>
                          {workspace.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {workspace.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{workspace.memberCount}</TableCell>
                      <TableCell>
                        {workspace.taskCount > 0 ? (
                          <div className="flex items-center gap-2 min-w-32">
                            <Progress
                              value={workspace.progress}
                              className="h-2 flex-1"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {workspace.completedTaskCount}/{workspace.taskCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {workspace.dueDate
                          ? new Date(workspace.dueDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(workspace)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatLastActivity(workspace.lastActivityAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  window.location.href = `/dashboard/workspaces/${workspace.id}`;
                                }}
                                disabled={!!workspace.deletedAt}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedWorkspace(workspace);
                                  setDuplicateDialogOpen(true);
                                }}
                                disabled={!!workspace.deletedAt}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedWorkspace(workspace);
                                  setSaveAsTemplateDialogOpen(true);
                                }}
                                disabled={!!workspace.deletedAt}
                              >
                                <LayoutTemplate className="mr-2 h-4 w-4" />
                                Save as Template
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {workspace.deletedAt ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedWorkspace(workspace);
                                      setRestoreDialogOpen(true);
                                    }}
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restore
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedWorkspace(workspace);
                                      setHardDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedWorkspace(workspace);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog (Soft Delete) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>Are you sure you want to delete &quot;{selectedWorkspace?.name}&quot;?</span>
              <br /><br />
              <span>The workspace will be moved to trash and automatically deleted after 30 days. You can restore it anytime before then.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
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

      {/* Hard Delete Confirmation Dialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Permanently Delete Workspace
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to permanently delete &quot;{selectedWorkspace?.name}&quot;?
                </p>
                <p className="font-semibold text-destructive">
                  This action cannot be undone. All data including:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Sections and tasks</li>
                  <li>Form submissions and responses</li>
                  <li>Files and attachments</li>
                  <li>Messages and comments</li>
                  <li>All member associations</li>
                </ul>
                <p className="font-semibold text-destructive">
                  will be permanently deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore &quot;{selectedWorkspace?.name}&quot;? This will
              make the workspace active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <DuplicateDialog
        workspace={selectedWorkspace}
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        onSuccess={(newWorkspaceId) => {
          // Refresh workspaces list
          fetch("/api/admin/workspaces?includeDeleted=true", { credentials: "include" })
            .then((res) => res.json())
            .then((result) => setWorkspaces(result.data || []))
            .catch((err) => console.error("Error refreshing workspaces:", err));
        }}
      />

      {/* Save as Template Confirmation Dialog */}
      <AlertDialog open={saveAsTemplateDialogOpen} onOpenChange={setSaveAsTemplateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save as Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert &quot;{selectedWorkspace?.name}&quot; into a template. The workspace
              will no longer appear in the Workspaces list but can be used to quickly create new
              client workspaces from the Templates section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsTemplate} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save as Template"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
