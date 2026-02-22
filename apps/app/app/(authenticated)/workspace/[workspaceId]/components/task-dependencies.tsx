"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Badge } from "@repo/design/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design/components/ui/dialog";
import {
  Link2,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Circle,
  Lock,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { toast } from "sonner";

interface Dependency {
  id: string;
  dependsOnTaskId: string;
  type: string;
  offsetDays: number | null;
  task: {
    id: string;
    title: string;
    status: string;
    sectionTitle: string;
  };
}

interface AvailableTask {
  id: string;
  title: string;
  sectionTitle: string;
}

interface TaskDependenciesProps {
  taskId: string;
  isAdmin?: boolean;
  onDependencyChange?: () => void;
}

export function TaskDependencies({
  taskId,
  isAdmin,
  onDependencyChange,
}: TaskDependenciesProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // Fetch dependencies
  const fetchDependencies = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/dependencies`);
      if (response.ok) {
        const data = await response.json();
        setDependencies(data.dependencies || []);
        setAvailableTasks(data.availableTasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch dependencies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, [taskId]);

  // Add dependency
  const handleAddDependency = async () => {
    if (!selectedTaskId) {
      toast.error("Please select a task");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dependsOnTaskId: selectedTaskId,
          type: "unlock",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add dependency");
      }

      toast.success("Dependency added");
      setDialogOpen(false);
      setSelectedTaskId("");
      fetchDependencies();
      onDependencyChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add dependency");
    } finally {
      setIsAdding(false);
    }
  };

  // Remove dependency
  const handleRemoveDependency = async (dependencyId: string) => {
    setIsRemoving(dependencyId);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/dependencies?dependencyId=${dependencyId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to remove dependency");
      }

      toast.success("Dependency removed");
      fetchDependencies();
      onDependencyChange?.();
    } catch (error) {
      toast.error("Failed to remove dependency");
    } finally {
      setIsRemoving(null);
    }
  };

  // Group available tasks by section
  const groupedTasks = availableTasks.reduce((acc, task) => {
    if (!acc[task.sectionTitle]) {
      acc[task.sectionTitle] = [];
    }
    acc[task.sectionTitle].push(task);
    return acc;
  }, {} as Record<string, AvailableTask[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Link2 className="inline h-3 w-3 mr-1" />
          Prerequisites
        </h3>
        {isAdmin && availableTasks.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Prerequisite</DialogTitle>
                <DialogDescription>
                  Select a task that must be completed before this task can be started.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedTasks).map(([section, tasks]) => (
                      <div key={section}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {section}
                        </div>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddDependency} disabled={isAdding || !selectedTaskId}>
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Prerequisite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {dependencies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No prerequisites. This task can be started immediately.
        </p>
      ) : (
        <div className="space-y-2">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className={cn(
                "flex items-center justify-between rounded-md border p-2",
                dep.task.status === "completed"
                  ? "border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20"
                  : "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {dep.task.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{dep.task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {dep.task.sectionTitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    dep.task.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}
                >
                  {dep.task.status === "completed" ? "Done" : "Pending"}
                </Badge>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveDependency(dep.id)}
                    disabled={isRemoving === dep.id}
                  >
                    {isRemoving === dep.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
