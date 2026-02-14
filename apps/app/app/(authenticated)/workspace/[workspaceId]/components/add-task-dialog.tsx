"use client";

import { useState } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import { Textarea } from "@repo/design/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import {
  FileText,
  CheckSquare,
  Upload,
  ThumbsUp,
  Calendar,
  FileSignature,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const TASK_TYPES = [
  { value: "FORM", label: "Form", icon: FileText, description: "Collect information with a form" },
  { value: "ACKNOWLEDGEMENT", label: "Acknowledgement", icon: CheckSquare, description: "Request confirmation or acceptance" },
  { value: "FILE_REQUEST", label: "File Upload", icon: Upload, description: "Request file uploads" },
  { value: "APPROVAL", label: "Approval", icon: ThumbsUp, description: "Request approval or rejection" },
  { value: "TIME_BOOKING", label: "Booking", icon: Calendar, description: "Schedule a meeting or appointment" },
  { value: "E_SIGN", label: "E-Signature", icon: FileSignature, description: "Request a digital signature" },
] as const;

type TaskType = typeof TASK_TYPES[number]["value"];

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  currentTaskCount: number;
  onTaskCreated: () => void;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  sectionId,
  currentTaskCount,
  onTaskCreated,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("FORM");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`/api/sections/${sectionId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type: taskType,
          position: currentTaskCount, // Add at end
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create task");
      }

      toast.success("Task created");
      onOpenChange(false);
      resetForm();
      onTaskCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTaskType("FORM");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const selectedType = TASK_TYPES.find((t) => t.value === taskType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Create a new task in this section
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Task Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  {selectedType.description}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={creating}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={creating}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !title.trim()}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
