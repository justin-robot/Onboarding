"use client";

import { useEffect, useState } from "react";
import { TaskAction } from "./task-actions";
import { Button } from "@repo/design/components/ui/button";
import { Badge } from "@repo/design/components/ui/badge";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import {
  Loader2,
  X,
  FileText,
  CheckSquare,
  Upload,
  Calendar,
  FileSignature,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";

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
  onClose: () => void;
  onTaskComplete: () => void;
  isAdmin?: boolean;
}

export function TaskDetailsPanel({
  task,
  onClose,
  onTaskComplete,
  isAdmin,
}: TaskDetailsPanelProps) {
  const [config, setConfig] = useState<TaskConfig>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch task details with config when task changes
  useEffect(() => {
    const fetchTaskDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tasks/${task.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch task details");
        }
        const data = await response.json();
        setConfig(data.config);
      } catch (err) {
        console.error("Error fetching task details:", err);
        setError("Failed to load task details");
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [task.id]);

  // Extract config-specific props based on task type
  const getConfigProps = () => {
    if (!config) return {};

    switch (task.type) {
      case "form":
        return { formConfigId: (config as FormConfig).id };
      case "acknowledgement":
        return { instructions: (config as AcknowledgementConfig).instructions || task.description || undefined };
      case "esign":
        // TODO: Fetch file URL from file service
        return {
          documentName: "Document.pdf",
          documentUrl: undefined,
        };
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content area with description and action */}
      <ScrollArea className="flex-1">
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

          {/* Due date */}
          {task.dueDate && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Due Date
              </h3>
              <p className="text-sm text-foreground">
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

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
    </div>
  );
}
