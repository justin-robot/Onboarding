"use client";

import { useEffect, useState } from "react";
import { ActionDetails } from "@repo/design/components/moxo-layout";
import { TaskAction } from "./task-actions";
import { Loader2 } from "lucide-react";

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

  return (
    <div className="flex h-full flex-col">
      {/* Task header and info */}
      <ActionDetails
        title={task.title}
        description={task.description || undefined}
        type={task.type}
        isYourTurn={task.isYourTurn}
        isCompleted={task.isCompleted}
        dueDate={task.dueDate}
        onClose={onClose}
        className="flex-shrink-0"
      />

      {/* Task action area */}
      <div className="flex-1 overflow-auto border-t border-border p-4">
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
  );
}
