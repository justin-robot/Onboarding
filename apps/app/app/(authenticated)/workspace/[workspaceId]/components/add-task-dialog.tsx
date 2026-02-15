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
  Link,
  Mail,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@repo/design/components/ui/alert";

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

  // TIME_BOOKING config
  const [bookingLink, setBookingLink] = useState("");

  // E_SIGN config
  const [signerEmail, setSignerEmail] = useState("");

  // Whether to configure now or later
  const [configureNow, setConfigureNow] = useState(true);

  // Check if this type requires config
  const requiresConfig = taskType === "TIME_BOOKING" || taskType === "E_SIGN";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    // Validate config if configuring now
    if (configureNow && requiresConfig) {
      if (taskType === "TIME_BOOKING" && !bookingLink.trim()) {
        toast.error("Please enter a booking link");
        return;
      }
      if (taskType === "TIME_BOOKING" && bookingLink.trim()) {
        try {
          new URL(bookingLink);
        } catch {
          toast.error("Please enter a valid URL");
          return;
        }
      }
      if (taskType === "E_SIGN" && !signerEmail.trim()) {
        toast.error("Please enter the signer's email");
        return;
      }
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

      const createdTask = await response.json();

      // Create config if needed
      if (configureNow && requiresConfig) {
        let configBody: Record<string, unknown> = {};

        if (taskType === "TIME_BOOKING") {
          configBody = { bookingLink: bookingLink.trim() };
        } else if (taskType === "E_SIGN") {
          // For E_SIGN, we need a file. For now, create with just email
          // The user will need to upload a document via the config dialog
          configBody = { signerEmail: signerEmail.trim(), fileId: "" };
        }

        if (Object.keys(configBody).length > 0) {
          const configResponse = await fetch(`/api/tasks/${createdTask.id}/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(configBody),
          });

          if (!configResponse.ok) {
            console.error("Failed to create config, task created without config");
          }
        }
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
    setBookingLink("");
    setSignerEmail("");
    setConfigureNow(true);
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

            {/* Configuration for TIME_BOOKING */}
            {taskType === "TIME_BOOKING" && (
              <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/30 dark:bg-orange-950/20">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Booking Configuration</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bookingLink">Booking Link</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="bookingLink"
                      placeholder="https://calendly.com/your-link"
                      value={bookingLink}
                      onChange={(e) => setBookingLink(e.target.value)}
                      className="pl-10"
                      disabled={creating}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste your Calendly, Cal.com, or other scheduling link. You can also configure this later.
                  </p>
                </div>
              </div>
            )}

            {/* Configuration for E_SIGN */}
            {taskType === "E_SIGN" && (
              <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                <div className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium">E-Signature Configuration</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signerEmail">Signer Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signerEmail"
                      type="email"
                      placeholder="signer@example.com"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      className="pl-10"
                      disabled={creating}
                    />
                  </div>
                </div>
                <Alert className="bg-transparent border-0 p-0">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <AlertDescription className="text-xs text-muted-foreground">
                    You'll need to upload the document to sign after creating the task.
                  </AlertDescription>
                </Alert>
              </div>
            )}
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
