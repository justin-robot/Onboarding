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
  Settings,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { formatDistanceToNow } from "date-fns";
import { UserMenu } from "../components/user-menu";

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
  userRole?: string | null;
}

export function WorkspaceList({ workspaces, userId, userRole }: WorkspaceListProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Show admin panel if user is platform admin OR admin of any workspace
  const canAccessAdmin = userRole === "admin" || workspaces.some((w) => w.role === "admin");

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
        <div className="flex items-center gap-2">
          {canAccessAdmin && (
            <Link href="/dashboard">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </Button>
          <UserMenu />
        </div>
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
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
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 py-0 overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600" />

        <CardHeader className="pt-0 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Icon - overlaps banner */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-md -mt-6 border-2 border-background">
                <span className="text-base font-semibold">
                  {workspace.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="pt-1">
                <CardTitle className="line-clamp-1 text-base group-hover:text-primary transition-colors">
                  {workspace.name}
                </CardTitle>
                {workspace.role === "admin" && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            {workspace.isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-1" />
            )}
          </div>
          {workspace.description && (
            <CardDescription className="line-clamp-2 mt-3">
              {workspace.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pb-5">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {workspace.completedTasks}/{workspace.totalTasks} tasks
              </span>
            </div>
            <Progress value={workspace.progress} className="h-2" />
          </div>

          {/* Due date */}
          {workspace.dueDate && (
            <div
              className={cn(
                "mt-4 flex items-center gap-2 text-sm",
                isOverdue
                  ? "text-red-500"
                  : isDueSoon
                  ? "text-amber-500"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-4 w-4" />
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
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
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
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 py-0">
        <div className="flex items-center gap-5 px-5 py-4">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
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
              <p className="text-sm text-muted-foreground truncate mt-1">
                {workspace.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="hidden sm:block w-36">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                {workspace.completedTasks}/{workspace.totalTasks}
              </span>
              <span className="font-medium">{workspace.progress}%</span>
            </div>
            <Progress value={workspace.progress} className="h-2" />
          </div>

          {/* Updated */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
            <Clock className="h-4 w-4" />
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
