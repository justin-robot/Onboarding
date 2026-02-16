"use client";

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Upload, X, File, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  multiple?: boolean;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>; // e.g., { "image/*": [".jpg", ".png"] }
}

interface SelectedFile {
  file: File;
  error?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export function UploadDialog({
  open,
  onOpenChange,
  workspaceId,
  onUploadComplete,
  multiple = false,
  maxSize,
  accept,
}: UploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | undefined => {
      // Check size
      if (maxSize && file.size > maxSize) {
        return `File is too large. Maximum size is ${formatFileSize(maxSize)}`;
      }

      // Check type
      if (accept) {
        const acceptedTypes = Object.keys(accept);
        const acceptedExtensions = Object.values(accept).flat();
        const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

        const typeMatch = acceptedTypes.some((type) => {
          if (type.endsWith("/*")) {
            const baseType = type.replace("/*", "");
            return file.type.startsWith(baseType);
          }
          return file.type === type;
        });

        const extensionMatch = acceptedExtensions.some(
          (ext) => ext.toLowerCase() === fileExtension
        );

        if (!typeMatch && !extensionMatch) {
          return "File type not allowed";
        }
      }

      return undefined;
    },
    [maxSize, accept]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newFiles: SelectedFile[] = fileArray.map((file) => ({
        file,
        error: validateFile(file),
      }));

      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      } else {
        setSelectedFiles(newFiles.slice(0, 1));
      }
    },
    [multiple, validateFile]
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const { files } = e.dataTransfer;
      if (files?.length) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files?.length) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = async () => {
    const validFiles = selectedFiles.filter((sf) => !sf.error);
    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const uploadedFiles: UploadedFile[] = [];
    const totalFiles = validFiles.length;

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const { file } = validFiles[i];

        // Step 1: Get presigned URL
        const presignResponse = await fetch(
          `/api/workspaces/${workspaceId}/files/upload`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              mimeType: file.type || "application/octet-stream",
            }),
          }
        );

        if (!presignResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadUrl, key } = await presignResponse.json();

        // Step 2: Upload to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        // Step 3: Confirm upload
        const confirmResponse = await fetch(
          `/api/workspaces/${workspaceId}/files/confirm`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key,
              name: file.name,
              mimeType: file.type || "application/octet-stream",
              size: file.size,
            }),
          }
        );

        if (!confirmResponse.ok) {
          throw new Error("Failed to confirm upload");
        }

        const uploadedFile = await confirmResponse.json();
        uploadedFiles.push(uploadedFile);

        // Update progress
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      // Success
      onUploadComplete?.(uploadedFiles);
      setSelectedFiles([]);
      onOpenChange(false);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const hasValidFiles = selectedFiles.some((sf) => !sf.error);

  // Build accept string for file input
  const acceptString = accept
    ? [...Object.keys(accept), ...Object.values(accept).flat()].join(",")
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        {/* Dropzone */}
        <div
          data-testid="dropzone"
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or{" "}
            <Button variant="link" className="p-0 h-auto" type="button">
              browse
            </Button>
          </p>
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max file size: {formatFileSize(maxSize)}
            </p>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          data-testid="file-input"
          className="hidden"
          multiple={multiple}
          accept={acceptString}
          onChange={handleFileInput}
        />

        {/* Selected files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-auto">
            {selectedFiles.map((sf, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg",
                  sf.error ? "bg-destructive/10" : "bg-muted"
                )}
              >
                <File className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sf.file.name}</p>
                  {sf.error ? (
                    <p className="text-xs text-destructive">{sf.error}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(sf.file.size)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} role="progressbar" />
            <p className="text-xs text-center text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Upload failed: {uploadError}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={!hasValidFiles || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export type { UploadDialogProps, UploadedFile };
