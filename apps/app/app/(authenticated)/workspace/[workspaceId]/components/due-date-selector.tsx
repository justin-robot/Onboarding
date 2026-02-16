"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design/components/ui/popover";
import { Calendar } from "@repo/design/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/components/ui/tabs";
import {
  CalendarIcon,
  Link2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface AnchorTask {
  id: string;
  title: string;
  sectionTitle: string;
}

interface DueDateDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: string;
  offsetDays: number | null;
}

interface DueDateSelectorProps {
  taskId: string;
  currentDueDate?: Date | string | null;
  dueDateType?: "absolute" | "relative";
  onDueDateChange: () => void;
  disabled?: boolean;
}

export function DueDateSelector({
  taskId,
  currentDueDate,
  dueDateType = "absolute",
  onDueDateChange,
  disabled = false,
}: DueDateSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  // State for absolute due date
  const [absoluteDate, setAbsoluteDate] = useState<Date | undefined>(
    currentDueDate ? new Date(currentDueDate) : undefined
  );

  // State for relative due date
  const [availableAnchors, setAvailableAnchors] = useState<AnchorTask[]>([]);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string>("");
  const [offsetDays, setOffsetDays] = useState<number>(0);
  const [currentDependency, setCurrentDependency] = useState<DueDateDependency | null>(null);
  const [anchorTaskTitle, setAnchorTaskTitle] = useState<string>("");

  // Determine initial tab based on current type
  const [activeTab, setActiveTab] = useState<string>(dueDateType);

  // Fetch due date dependency info
  useEffect(() => {
    const fetchDependencyInfo = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tasks/${taskId}/due-date-dependency`);
        if (response.ok) {
          const data = await response.json();
          setAvailableAnchors(data.availableAnchors || []);
          setCurrentDependency(data.dependency);
          if (data.dependency) {
            setSelectedAnchorId(data.dependency.dependsOnTaskId);
            setOffsetDays(data.dependency.offsetDays ?? 0);
            setAnchorTaskTitle(data.anchorTask?.title || "");
            setActiveTab("relative");
          }
        }
      } catch (error) {
        console.error("Failed to fetch due date dependency:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchDependencyInfo();
    }
  }, [taskId, open]);

  // Handle saving absolute due date
  const handleSaveAbsolute = async () => {
    setSaving(true);
    try {
      // First, remove any relative dependency
      if (currentDependency) {
        await fetch(`/api/tasks/${taskId}/due-date-dependency`, {
          method: "DELETE",
        });
      }

      // Then set the absolute due date
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDateType: "absolute",
          dueDateValue: absoluteDate?.toISOString() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save due date");
      }

      toast.success(absoluteDate ? "Due date saved" : "Due date cleared");
      setOpen(false);
      onDueDateChange();
    } catch (error) {
      toast.error("Failed to save due date");
    } finally {
      setSaving(false);
    }
  };

  // Handle saving relative due date
  const handleSaveRelative = async () => {
    if (!selectedAnchorId) {
      toast.error("Please select a task to anchor to");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/due-date-dependency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorTaskId: selectedAnchorId,
          offsetDays: offsetDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save relative due date");
      }

      toast.success("Relative due date saved");
      setOpen(false);
      onDueDateChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Handle clearing due date
  const handleClear = async () => {
    setSaving(true);
    try {
      // Remove relative dependency if exists
      if (currentDependency) {
        await fetch(`/api/tasks/${taskId}/due-date-dependency`, {
          method: "DELETE",
        });
      }

      // Clear the due date
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDateType: "absolute",
          dueDateValue: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to clear due date");
      }

      setAbsoluteDate(undefined);
      setCurrentDependency(null);
      setSelectedAnchorId("");
      setOffsetDays(0);
      toast.success("Due date cleared");
      setOpen(false);
      onDueDateChange();
    } catch (error) {
      toast.error("Failed to clear due date");
    } finally {
      setSaving(false);
    }
  };

  // Format the current due date display
  const getDueDateDisplay = () => {
    if (currentDependency && anchorTaskTitle) {
      const days = currentDependency.offsetDays ?? 0;
      if (days === 0) {
        return `Same day as "${anchorTaskTitle}"`;
      } else if (days > 0) {
        return `${days} day${days !== 1 ? "s" : ""} after "${anchorTaskTitle}"`;
      } else {
        return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} before "${anchorTaskTitle}"`;
      }
    }

    if (currentDueDate) {
      return format(new Date(currentDueDate), "MMM d, yyyy");
    }

    return "No due date";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal",
            !currentDueDate && !currentDependency && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          {currentDependency ? (
            <Link2 className="mr-2 h-4 w-4" />
          ) : (
            <CalendarIcon className="mr-2 h-4 w-4" />
          )}
          <span className="truncate">{getDueDateDisplay()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="absolute" className="text-xs">
                <CalendarIcon className="mr-1.5 h-3 w-3" />
                Fixed Date
              </TabsTrigger>
              <TabsTrigger value="relative" className="text-xs">
                <Link2 className="mr-1.5 h-3 w-3" />
                Relative
              </TabsTrigger>
            </TabsList>

            <TabsContent value="absolute" className="p-3 pt-2">
              <Calendar
                mode="single"
                selected={absoluteDate}
                onSelect={setAbsoluteDate}
                initialFocus
              />
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleClear}
                  disabled={saving || (!absoluteDate && !currentDependency)}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveAbsolute}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="relative" className="p-3 pt-2 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Days offset</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={offsetDays}
                    onChange={(e) => setOffsetDays(parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">
                    {offsetDays >= 0 ? "days after" : "days before"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use negative numbers for days before
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Anchor task (when completed)</Label>
                <Select
                  value={selectedAnchorId}
                  onValueChange={setSelectedAnchorId}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAnchors.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No other tasks available
                      </div>
                    ) : (
                      availableAnchors.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          <div className="flex flex-col">
                            <span className="truncate">{task.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {task.sectionTitle}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedAnchorId && (
                <div className="rounded-md bg-muted p-2 text-xs">
                  <p className="text-muted-foreground">
                    Due date will be set to{" "}
                    <span className="font-medium text-foreground">
                      {offsetDays === 0
                        ? "the same day"
                        : offsetDays > 0
                        ? `${offsetDays} day${offsetDays !== 1 ? "s" : ""} after`
                        : `${Math.abs(offsetDays)} day${Math.abs(offsetDays) !== 1 ? "s" : ""} before`}
                    </span>{" "}
                    the anchor task is completed.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleClear}
                  disabled={saving || !currentDependency}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveRelative}
                  disabled={saving || !selectedAnchorId}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}
