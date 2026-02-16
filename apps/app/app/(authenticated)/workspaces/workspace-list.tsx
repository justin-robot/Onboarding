"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import { Badge } from "@repo/design/components/ui/badge";
import { Progress } from "@repo/design/components/ui/progress";
import {
  Plus,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  Calendar,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { formatDistanceToNow } from "date-fns";

interface WorkspaceData {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  isCompleted: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkspaceListProps {
  workspaces: WorkspaceData[];
  userId: string;
}

export function WorkspaceList({ workspaces, userId }: WorkspaceListProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredWorkspaces = workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Manage your client workspaces and workflows
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
      </div>

      {/* Workspace Grid/List */}
      {filteredWorkspaces.length === 0 ? (
        <EmptyState
          hasWorkspaces={workspaces.length > 0}
          onCreateClick={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceListItem key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        userId={userId}
      />
    </div>
  );
}

function WorkspaceCard({ workspace }: { workspace: WorkspaceData }) {
  const isDueSoon =
    workspace.dueDate &&
    new Date(workspace.dueDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  const isOverdue =
    workspace.dueDate && new Date(workspace.dueDate) < new Date();

  return (
    <Link href={`/workspace/${workspace.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
        {/* Banner */}
        <div className="h-20 rounded-t-lg bg-gradient-to-r from-blue-500 to-blue-600" />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm -mt-8 border-2 border-background">
                <span className="text-sm font-semibold">
                  {workspace.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <CardTitle className="line-clamp-1 text-base group-hover:text-primary transition-colors">
                  {workspace.name}
                </CardTitle>
                {workspace.role === "admin" && (
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            {workspace.isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            )}
          </div>
          {workspace.description && (
            <CardDescription className="line-clamp-2 mt-2">
              {workspace.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {workspace.completedTasks}/{workspace.totalTasks} tasks
              </span>
            </div>
            <Progress value={workspace.progress} className="h-1.5" />
          </div>

          {/* Due date */}
          {workspace.dueDate && (
            <div
              className={cn(
                "mt-3 flex items-center gap-1.5 text-sm",
                isOverdue
                  ? "text-red-500"
                  : isDueSoon
                  ? "text-amber-500"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {isOverdue
                  ? "Overdue"
                  : `Due ${formatDistanceToNow(new Date(workspace.dueDate), {
                      addSuffix: true,
                    })}`}
              </span>
            </div>
          )}

          {/* Last activity */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(workspace.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function WorkspaceListItem({ workspace }: { workspace: WorkspaceData }) {
  return (
    <Link href={`/workspace/${workspace.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
        <div className="flex items-center gap-4 p-4">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
            <Building2 className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {workspace.name}
              </h3>
              {workspace.isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              )}
              {workspace.role === "admin" && (
                <Badge variant="secondary" className="text-xs">
                  Admin
                </Badge>
              )}
            </div>
            {workspace.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {workspace.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="hidden sm:block w-32">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                {workspace.completedTasks}/{workspace.totalTasks}
              </span>
              <span className="font-medium">{workspace.progress}%</span>
            </div>
            <Progress value={workspace.progress} className="h-1.5" />
          </div>

          {/* Updated */}
          <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatDistanceToNow(new Date(workspace.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({
  hasWorkspaces,
  onCreateClick,
}: {
  hasWorkspaces: boolean;
  onCreateClick: () => void;
}) {
  if (hasWorkspaces) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">No matching workspaces</h3>
        <p className="text-muted-foreground mt-1">
          Try adjusting your search terms
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold">No workspaces yet</h3>
      <p className="text-muted-foreground mt-1 mb-4">
        Create your first workspace to get started
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        Create Workspace
      </Button>
    </div>
  );
}
