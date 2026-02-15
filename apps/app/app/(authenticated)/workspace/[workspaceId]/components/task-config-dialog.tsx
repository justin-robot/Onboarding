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
  Calendar,
  FileSignature,
  Loader2,
  Link,
  Mail,
  FileText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type TaskType = "form" | "acknowledgement" | "file_upload" | "approval" | "booking" | "esign";

interface TaskConfig {
  bookingLink?: string | null;
  fileId?: string | null;
  signerEmail?: string | null;
  instructions?: string | null;
  targetFolderId?: string | null;
}

interface TaskConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskType: TaskType;
  taskTitle: string;
  existingConfig?: TaskConfig | null;
  onConfigSaved: () => void;
}

// Map UI types to DB types
const typeMap: Record<TaskType, string> = {
  form: "FORM",
  acknowledgement: "ACKNOWLEDGEMENT",
  file_upload: "FILE_REQUEST",
  approval: "APPROVAL",
  booking: "TIME_BOOKING",
  esign: "E_SIGN",
};

export function TaskConfigDialog({
  open,
  onOpenChange,
  taskId,
  taskType,
  taskTitle,
  existingConfig,
  onConfigSaved,
}: TaskConfigDialogProps) {
  // Form state for TIME_BOOKING
  const [bookingLink, setBookingLink] = useState(existingConfig?.bookingLink || "");

  // Form state for E_SIGN
  const [signerEmail, setSignerEmail] = useState(existingConfig?.signerEmail || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState(existingConfig?.fileId || "");

  // Form state for ACKNOWLEDGEMENT
  const [instructions, setInstructions] = useState(existingConfig?.instructions || "");

  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let configBody: Record<string, unknown> = {};

      switch (taskType) {
        case "booking":
          if (!bookingLink.trim()) {
            toast.error("Please enter a booking link");
            setSaving(false);
            return;
          }
          // Validate URL
          try {
            new URL(bookingLink);
          } catch {
            toast.error("Please enter a valid URL");
            setSaving(false);
            return;
          }
          configBody = { bookingLink: bookingLink.trim() };
          break;

        case "esign":
          if (!fileId) {
            toast.error("Please upload a document to sign");
            setSaving(false);
            return;
          }
          if (!signerEmail.trim()) {
            toast.error("Please enter the signer's email");
            setSaving(false);
            return;
          }
          configBody = { fileId, signerEmail: signerEmail.trim() };
          break;

        case "acknowledgement":
          configBody = { instructions: instructions.trim() || null };
          break;

        default:
          toast.error("This task type does not require configuration");
          setSaving(false);
          return;
      }

      const response = await fetch(`/api/tasks/${taskId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save configuration");
      }

      toast.success("Configuration saved");
      onOpenChange(false);
      onConfigSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setSelectedFile(file);

    try {
      // Get presigned URL
      const uploadResponse = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          filename: file.name,
          mimeType: file.type || "application/pdf",
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, key } = await uploadResponse.json();

      // Upload to S3
      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/pdf",
        },
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload file");
      }

      // Confirm upload
      const confirmResponse = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          taskId,
          name: file.name,
          mimeType: file.type || "application/pdf",
          size: file.size,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error("Failed to confirm upload");
      }

      const uploadedFile = await confirmResponse.json();
      setFileId(uploadedFile.id);
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
      setSelectedFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form state
      setBookingLink(existingConfig?.bookingLink || "");
      setSignerEmail(existingConfig?.signerEmail || "");
      setFileId(existingConfig?.fileId || "");
      setSelectedFile(null);
      setInstructions(existingConfig?.instructions || "");
    }
    onOpenChange(newOpen);
  };

  const getTitle = () => {
    switch (taskType) {
      case "booking":
        return "Configure Booking";
      case "esign":
        return "Configure E-Signature";
      case "acknowledgement":
        return "Configure Acknowledgement";
      default:
        return "Configure Task";
    }
  };

  const getDescription = () => {
    switch (taskType) {
      case "booking":
        return "Set up the booking link for scheduling meetings";
      case "esign":
        return "Upload a document and specify who should sign it";
      case "acknowledgement":
        return "Add instructions that users must acknowledge";
      default:
        return "Configure task settings";
    }
  };

  const getIcon = () => {
    switch (taskType) {
      case "booking":
        return <Calendar className="h-5 w-5 text-orange-600" />;
      case "esign":
        return <FileSignature className="h-5 w-5 text-indigo-600" />;
      case "acknowledgement":
        return <FileText className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {getIcon()}
              <DialogTitle>{getTitle()}</DialogTitle>
            </div>
            <DialogDescription>
              {getDescription()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task title reference */}
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">Task</p>
              <p className="font-medium text-sm">{taskTitle}</p>
            </div>

            {/* TIME_BOOKING config */}
            {taskType === "booking" && (
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
                    disabled={saving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste your Calendly, Cal.com, or other scheduling link
                </p>
              </div>
            )}

            {/* E_SIGN config */}
            {taskType === "esign" && (
              <>
                <div className="space-y-2">
                  <Label>Document to Sign</Label>
                  <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/30 p-4">
                    {selectedFile || fileId ? (
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {selectedFile?.name || "Document uploaded"}
                          </p>
                          {selectedFile && (
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>Replace</span>
                          </Button>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            disabled={uploadingFile || saving}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer flex-1">
                        {uploadingFile ? (
                          <Loader2 className="h-8 w-8 text-muted-foreground/50 animate-spin" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground/50" />
                        )}
                        <span className="mt-2 text-sm text-muted-foreground">
                          {uploadingFile ? "Uploading..." : "Click to upload document"}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, DOCX
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          disabled={uploadingFile || saving}
                        />
                      </label>
                    )}
                  </div>
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
                      disabled={saving}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The person who needs to sign the document
                  </p>
                </div>
              </>
            )}

            {/* ACKNOWLEDGEMENT config */}
            {taskType === "acknowledgement" && (
              <div className="space-y-2">
                <Label htmlFor="instructions">
                  Instructions <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="Add instructions or content that users must acknowledge..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={saving}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  These instructions will be shown to users when they acknowledge this task
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploadingFile}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
