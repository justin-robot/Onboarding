"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import {
  Download,
  ExternalLink,
  Trash2,
  File,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { format } from "date-fns";

interface FileVersion {
  id: string;
  name: string;
  uploadedAt: Date;
}

interface PreviewFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
}

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PreviewFile | null;
  onDelete?: (fileId: string) => void;
  versions?: FileVersion[];
  onVersionSelect?: (versionId: string) => void;
  loading?: boolean;
  error?: string;
}

export function FilePreviewModal({
  open,
  onOpenChange,
  file,
  onDelete,
  versions,
  onVersionSelect,
  loading,
  error,
}: FilePreviewModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!file) return null;

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(file.id);
  };

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";
  const isVideo = file.mimeType.startsWith("video/");
  const isAudio = file.mimeType.startsWith("audio/");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="truncate pr-8">{file.name}</DialogTitle>
          </DialogHeader>

          {/* Preview content */}
          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <div
                data-testid="preview-loading"
                className="flex items-center justify-center h-64"
              >
                <Skeleton className="h-full w-full" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <File className="h-12 w-12 mb-4" />
                <p>Failed to load preview: {error}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center bg-muted rounded-lg min-h-64">
                {isImage && file.url && (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="max-h-[60vh] max-w-full object-contain"
                  />
                )}

                {isPdf && file.url && (
                  <iframe
                    src={file.url}
                    title="PDF Preview"
                    className="w-full h-[60vh] rounded-lg"
                  />
                )}

                {isVideo && file.url && (
                  <video
                    src={file.url}
                    controls
                    data-testid="video-player"
                    className="max-h-[60vh] max-w-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {isAudio && file.url && (
                  <audio
                    src={file.url}
                    controls
                    data-testid="audio-player"
                    className="w-full max-w-md"
                  >
                    Your browser does not support the audio tag.
                  </audio>
                )}

                {!isImage && !isPdf && !isVideo && !isAudio && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <File
                      data-testid="file-icon"
                      className="h-16 w-16 mb-4"
                    />
                    <p className="text-sm">Preview not available for this file type</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File info */}
          <div className="flex-shrink-0 border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  Size: {formatFileSize(file.size)}
                </p>
                {file.uploadedBy && (
                  <p className="text-muted-foreground">
                    Uploaded by: <span className="text-foreground">{file.uploadedBy}</span>
                  </p>
                )}
                {file.uploadedAt && (
                  <p className="text-muted-foreground">
                    {format(file.uploadedAt, "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>

              {/* Version history dropdown */}
              {versions && versions.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Version history ({versions.length} versions)
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {versions.map((version) => (
                      <DropdownMenuItem
                        key={version.id}
                        onClick={() => onVersionSelect?.(version.id)}
                      >
                        {format(version.uploadedAt, "MMM d, yyyy")} -{" "}
                        {version.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {file.url && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.url} download aria-label="Download">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in new tab
                    </a>
                  </Button>
                </>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{file.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export type { FilePreviewModalProps, PreviewFile, FileVersion };
