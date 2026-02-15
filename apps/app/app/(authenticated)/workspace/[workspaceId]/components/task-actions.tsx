"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/design/components/ui/button";
import { Textarea } from "@repo/design/components/ui/textarea";
import { Badge } from "@repo/design/components/ui/badge";
import { Progress } from "@repo/design/components/ui/progress";
import { Calendar } from "@repo/design/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import {
  FileText,
  Upload,
  Calendar as CalendarIcon,
  FileSignature,
  ThumbsUp,
  ThumbsDown,
  CheckSquare,
  Download,
  ExternalLink,
  Loader2,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

type TaskType = "form" | "acknowledgement" | "file_upload" | "approval" | "booking" | "esign";

interface TaskActionProps {
  taskId: string;
  type: TaskType;
  isYourTurn: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  isAdmin?: boolean;
  formConfigId?: string;
  documentUrl?: string;
  documentName?: string;
  instructions?: string;
  onComplete?: () => void;
}

export function TaskAction({
  taskId,
  type,
  isYourTurn,
  isCompleted,
  isLocked,
  isAdmin,
  formConfigId,
  documentUrl,
  documentName,
  instructions,
  onComplete,
}: TaskActionProps) {
  if (isLocked) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          This task is locked. Complete the previous tasks to unlock it.
        </p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900/30 dark:bg-green-950/20">
        <CheckSquare className="mx-auto h-8 w-8 text-green-500" />
        <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
          This task has been completed
        </p>
      </div>
    );
  }

  switch (type) {
    case "form":
      return (
        <FormTaskAction
          taskId={taskId}
          formConfigId={formConfigId}
          isYourTurn={isYourTurn}
          isAdmin={isAdmin}
          onComplete={onComplete}
        />
      );
    case "acknowledgement":
      return (
        <AcknowledgementTaskAction
          taskId={taskId}
          instructions={instructions}
          isYourTurn={isYourTurn}
          onComplete={onComplete}
        />
      );
    case "file_upload":
      return (
        <FileUploadTaskAction
          taskId={taskId}
          isYourTurn={isYourTurn}
          onComplete={onComplete}
        />
      );
    case "approval":
      return (
        <ApprovalTaskAction
          taskId={taskId}
          isYourTurn={isYourTurn}
          onComplete={onComplete}
        />
      );
    case "booking":
      return (
        <BookingTaskAction
          taskId={taskId}
          isYourTurn={isYourTurn}
          onComplete={onComplete}
        />
      );
    case "esign":
      return (
        <ESignTaskAction
          taskId={taskId}
          documentUrl={documentUrl}
          documentName={documentName}
          isYourTurn={isYourTurn}
          onComplete={onComplete}
        />
      );
    default:
      return null;
  }
}

// Form Task Action
function FormTaskAction({
  taskId,
  formConfigId,
  isYourTurn,
  isAdmin,
  onComplete,
}: {
  taskId: string;
  formConfigId?: string;
  isYourTurn: boolean;
  isAdmin?: boolean;
  onComplete?: () => void;
}) {
  const router = useRouter();

  // Admin view - show edit form option
  if (isAdmin) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-base">Form Builder</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Design the form that users will complete for this task.
            </p>
            <Button
              className="w-full"
              onClick={() => router.push(`/forms/${taskId}/edit`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Edit Form
            </Button>
            {formConfigId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/forms/submit/${formConfigId}`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview Form
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isYourTurn) {
    return (
      <WaitingState message="Waiting for assignee to fill out the form" />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">Form Response</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Complete the form to proceed with this task.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              if (formConfigId) {
                router.push(`/forms/submit/${formConfigId}`);
              } else {
                toast.error("Form configuration not found");
              }
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Open Form
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Acknowledgement Task Action
function AcknowledgementTaskAction({
  taskId,
  instructions,
  isYourTurn,
  onComplete,
}: {
  taskId: string;
  instructions?: string;
  isYourTurn: boolean;
  onComplete?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isYourTurn) {
    return (
      <WaitingState message="Waiting for assignee to acknowledge" />
    );
  }

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to complete task");
      }

      toast.success("Task acknowledged successfully");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to acknowledge task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {instructions && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{instructions}</p>
          </CardContent>
        </Card>
      )}
      <Button
        className="w-full"
        onClick={handleAcknowledge}
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <CheckSquare className="mr-2 h-4 w-4" />
        Acknowledge
      </Button>
    </div>
  );
}

// Uploaded file info
interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// File Upload Task Action
function FileUploadTaskAction({
  taskId,
  isYourTurn,
  onComplete,
}: {
  taskId: string;
  isYourTurn: boolean;
  onComplete?: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  if (!isYourTurn) {
    return (
      <WaitingState message="Waiting for assignee to upload files" />
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned upload URL
      const uploadResponse = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, key } = await uploadResponse.json();
      setUploadProgress(20);

      // Step 2: Upload file to S3
      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload file to storage");
      }

      setUploadProgress(80);

      // Step 3: Confirm upload
      const confirmResponse = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          taskId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!confirmResponse.ok) {
        const error = await confirmResponse.json();
        throw new Error(error.error || "Failed to confirm upload");
      }

      const uploadedFile = await confirmResponse.json();
      setUploadProgress(100);

      setUploadedFiles((prev) => [
        ...prev,
        { id: uploadedFile.id, name: file.name, size: file.size },
      ]);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset input
      e.target.value = "";
    }
  };

  const handleComplete = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to complete task");
      }

      toast.success("Task completed successfully");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">Upload Files</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 hover:border-muted-foreground/50 transition-colors">
            <label className="flex flex-col items-center cursor-pointer">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground/50 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground/50" />
              )}
              <span className="mt-2 text-sm text-muted-foreground">
                {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>
          </div>

          {isUploading && uploadProgress > 0 && (
            <Progress value={uploadProgress} className="h-2" />
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Uploaded files:
              </p>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 text-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[180px]">{file.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleComplete}
        disabled={uploadedFiles.length === 0 || isUploading}
      >
        Submit Files
      </Button>
    </div>
  );
}

// Approval Task Action
function ApprovalTaskAction({
  taskId,
  isYourTurn,
  onComplete,
}: {
  taskId: string;
  isYourTurn: boolean;
  onComplete?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!isYourTurn) {
    return (
      <WaitingState message="Waiting for approver to review" />
    );
  }

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve");
      }

      toast.success("Approved successfully");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false, reason: rejectReason }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject");
      }

      toast.success("Rejected successfully");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to reject");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Review & Approve</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Review the submitted content and approve or reject it.
          </p>

          {showRejectReason ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Please provide a reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectReason(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Rejection
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRejectReason(true)}
                disabled={isSubmitting}
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                className="flex-1"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ThumbsUp className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Booking Task Action
function BookingTaskAction({
  taskId,
  isYourTurn,
  onComplete,
}: {
  taskId: string;
  isYourTurn: boolean;
  onComplete?: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSlots = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "01:00 PM",
    "01:30 PM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
  ];

  if (!isYourTurn) {
    return (
      <WaitingState message="Waiting for assignee to book a time" />
    );
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          time: selectedTime,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to book time");
      }

      toast.success("Time booked successfully");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to book time");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base">Select a Date & Time</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />

          {selectedDate && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Available times for {format(selectedDate, "MMMM d, yyyy")}:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleConfirm}
        disabled={!selectedDate || !selectedTime || isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm Booking
      </Button>
    </div>
  );
}

// E-Sign Task Action
function ESignTaskAction({
  taskId,
  documentUrl,
  documentName,
  isYourTurn,
  onComplete,
}: {
  taskId: string;
  documentUrl?: string;
  documentName?: string;
  isYourTurn: boolean;
  onComplete?: () => void;
}) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isYourTurn) {
    return (
      <WaitingState message="Waiting for signers to complete" />
    );
  }

  const handleSign = async () => {
    setIsRedirecting(true);
    try {
      // TODO: Get signing URL from API
      const response = await fetch(`/api/tasks/${taskId}/signing-url`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get signing URL");
      }

      const { signingUrl } = await response.json();
      window.location.href = signingUrl;
    } catch (error) {
      toast.error("Failed to start signing process");
      setIsRedirecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base">E-Sign Document</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentName && (
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{documentName}</p>
                <p className="text-xs text-muted-foreground">PDF Document</p>
              </div>
              {documentUrl && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={documentUrl} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleSign}
        disabled={isRedirecting}
      >
        {isRedirecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <FileSignature className="mr-2 h-4 w-4" />
        Sign Document
      </Button>
    </div>
  );
}

// Waiting State Component
function WaitingState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
      <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
