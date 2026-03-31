"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design/components/ui/table";
import { Button } from "@repo/design/components/ui/button";
import { Badge } from "@repo/design/components/ui/badge";
import { Progress } from "@repo/design/components/ui/progress";
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
  ArrowLeftIcon,
  Loader2,
  Plus,
  FileStack,
  ClipboardList,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { CreateFromTemplateDialog } from "./create-from-template-dialog";

interface Template {
  id: string;
  name: string;
  description: string | null;
  sectionCount: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DerivedWorkspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  isPublished: boolean;
  progress: number;
}

interface TemplateDetailProps {
  templateId: string;
}

export const TemplateDetail = ({ templateId }: TemplateDetailProps) => {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [derivedWorkspaces, setDerivedWorkspaces] = useState<DerivedWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTemplateData = async () => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}/workspaces`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch template");

      const result = await response.json();
      setTemplate(result.template);
      setDerivedWorkspaces(result.derivedWorkspaces);
    } catch (error) {
      console.error("Error fetching template:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplateData();
  }, [templateId]);

  const handleDelete = async () => {
    if (!template) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Template deleted successfully");
      router.push("/dashboard/templates");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading template...</span>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Template not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard/templates")}
            >
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/templates")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{template.name}</h1>
            {template.description && (
              <p className="text-muted-foreground mt-1">{template.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground ml-12">
          <div className="flex items-center gap-1.5">
            <FileStack className="h-4 w-4" />
            {template.sectionCount} section{template.sectionCount !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            {template.taskCount} task{template.taskCount !== 1 ? "s" : ""}
          </div>
          <span>Created {formatDate(template.createdAt)}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Derived Workspaces</CardTitle>
              <CardDescription>
                Workspaces created from this template ({derivedWorkspaces.length})
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {derivedWorkspaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No workspaces have been created from this template yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Name</TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
                  <TableHead className="w-[25%]">Progress</TableHead>
                  <TableHead className="w-[25%]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {derivedWorkspaces.map((workspace) => (
                  <TableRow
                    key={workspace.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/workspace/${workspace.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{workspace.name}</div>
                      {workspace.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {workspace.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={workspace.isPublished ? "default" : "outline"}>
                        {workspace.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-24">
                        <Progress value={workspace.progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {workspace.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(workspace.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create from Template Dialog */}
      <CreateFromTemplateDialog
        template={template}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          toast.success("Workspace created successfully");
          fetchTemplateData();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template &quot;{template.name}&quot;?
              This action cannot be undone. Existing workspaces created from this template
              will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
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
};
