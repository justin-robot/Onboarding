"use client";

import { useState } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import {
  Card,
  CardContent,
} from "@repo/design/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Folder,
  FileText,
  Image,
  FileVideo,
  FileAudio,
  File,
  Download,
  ExternalLink,
  MoreVertical,
  Upload,
  FolderPlus,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  mimeType?: string;
  size?: number;
  url?: string;
  thumbnailUrl?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
  itemCount?: number; // For folders
}

interface FilesViewProps {
  files: FileItem[];
  workspaceId: string;
  onFileClick?: (file: FileItem) => void;
  onUpload?: () => void;
  onFolderCreated?: (folder: FileItem) => void;
  onFileDeleted?: (fileId: string) => void;
}

export function FilesView({
  files,
  workspaceId,
  onFileClick,
  onUpload,
  onFolderCreated,
  onFileDeleted,
}: FilesViewProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  // Folder creation state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    setCreatingFolder(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      const folder = await response.json();
      toast.success("Folder created");
      setFolderDialogOpen(false);
      setFolderName("");
      // Notify parent to refresh without full page reload
      onFolderCreated?.({
        id: folder.id,
        name: folder.name,
        type: "folder",
        mimeType: folder.mimeType,
      });
    } catch (error) {
      toast.error("Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/files?fileId=${fileToDelete.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      const deletedId = fileToDelete.id;
      toast.success("File deleted");
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      // Notify parent to refresh without full page reload
      onFileDeleted?.(deletedId);
    } catch (error) {
      toast.error("Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(search.toLowerCase())
  );

  // Separate folders and files
  const folders = filteredFiles.filter((f) => f.type === "folder");
  const regularFiles = filteredFiles.filter((f) => f.type === "file");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 w-7 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 w-7 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Add menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFolderDialogOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Breadcrumb */}
      {currentPath.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border px-4 py-2 text-sm">
          <button
            onClick={() => setCurrentPath([])}
            className="text-muted-foreground hover:text-foreground"
          >
            Files
          </button>
          {currentPath.map((segment, index) => (
            <span key={index} className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                className={cn(
                  index === currentPath.length - 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {segment}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4">
        {filteredFiles.length === 0 ? (
          <EmptyState
            hasFiles={files.length > 0}
            onUpload={onUpload}
          />
        ) : viewMode === "grid" ? (
          <div className="space-y-6">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Folders
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => {
                        setCurrentPath([...currentPath, folder.name]);
                        onFileClick?.(folder);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {regularFiles.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Files
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {regularFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onClick={() => onFileClick?.(file)}
                      onDelete={(e) => openDeleteDialog(file, e)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {[...folders, ...regularFiles].map((item) => (
              <FileListItem
                key={item.id}
                item={item}
                onClick={() => {
                  if (item.type === "folder") {
                    setCurrentPath([...currentPath, item.name]);
                  }
                  onFileClick?.(item);
                }}
                onDelete={(e) => openDeleteDialog(item, e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              placeholder="My Folder"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              disabled={creatingFolder}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFolderDialogOpen(false)}
              disabled={creatingFolder}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={creatingFolder || !folderName.trim()}>
              {creatingFolder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {fileToDelete?.type === "folder" ? "Folder" : "File"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FolderCard({
  folder,
  onClick,
}: {
  folder: FileItem;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{folder.name}</p>
          {folder.itemCount !== undefined && (
            <p className="text-xs text-muted-foreground">
              {folder.itemCount} items
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FileCard({
  file,
  onClick,
  onDelete,
}: {
  file: FileItem;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const Icon = getFileIcon(file.mimeType);

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Thumbnail or icon */}
        <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-muted">
          {file.thumbnailUrl ? (
            <img
              src={file.thumbnailUrl}
              alt={file.name}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <Icon className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {file.size ? formatFileSize(file.size) : ""}
              {file.uploadedAt && (
                <> • {formatDistanceToNow(file.uploadedAt, { addSuffix: true })}</>
              )}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {file.url && (
                <>
                  <DropdownMenuItem asChild>
                    <a href={file.url} download onClick={(e) => e.stopPropagation()}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in new tab
                    </a>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function FileListItem({
  item,
  onClick,
  onDelete,
}: {
  item: FileItem;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const Icon = item.type === "folder" ? Folder : getFileIcon(item.mimeType);
  const iconColor = item.type === "folder" ? "text-blue-600" : "text-muted-foreground";

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/50 cursor-pointer group"
      onClick={onClick}
    >
      <Icon className={cn("h-5 w-5", iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
      </div>
      {item.type === "file" && item.size && (
        <span className="text-xs text-muted-foreground">
          {formatFileSize(item.size)}
        </span>
      )}
      {item.uploadedAt && (
        <span className="text-xs text-muted-foreground hidden sm:block">
          {formatDistanceToNow(item.uploadedAt, { addSuffix: true })}
        </span>
      )}

      {/* Actions */}
      {item.type === "file" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.url && (
              <>
                <DropdownMenuItem asChild>
                  <a href={item.url} download onClick={(e) => e.stopPropagation()}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in new tab
                  </a>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem className="text-red-600" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function EmptyState({
  hasFiles,
  onUpload,
}: {
  hasFiles: boolean;
  onUpload?: () => void;
}) {
  if (hasFiles) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">No matching files</h3>
        <p className="text-muted-foreground mt-1">
          Try adjusting your search terms
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Folder className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold">No files yet</h3>
      <p className="text-muted-foreground mt-1 mb-4">
        Upload files to share with your team
      </p>
      {onUpload && (
        <Button onClick={onUpload}>
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      )}
    </div>
  );
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType === "application/pdf" || mimeType.includes("document")) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export type { FileItem };
