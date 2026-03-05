"use client";

import { useListContext, ListBase as RaList, useRedirect } from "ra-core";
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
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design/components/ui/card";
import { Input } from "@repo/design/components/ui/input";
import { Eye, Pencil, Trash2, RotateCcw, SearchIcon, Building2 } from "lucide-react";
import { useState } from "react";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  memberCount: number;
  taskCount: number;
  createdAt: string;
  deletedAt: string | null;
}

const WorkspaceListInner = () => {
  const { data, isPending } = useListContext<Workspace>();
  const redirect = useRedirect();
  const [searchValue, setSearchValue] = useState("");

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading workspaces...</p>
      </div>
    );
  }

  const filteredData = searchValue
    ? data?.filter(
        (workspace) =>
          workspace.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
          workspace.description?.toLowerCase().includes(searchValue.toLowerCase())
      )
    : data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Workspaces</CardTitle>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workspaces..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredData || filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No workspaces found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((workspace) => (
                <TableRow key={workspace.id} className={workspace.deletedAt ? "opacity-50" : ""}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{workspace.name}</div>
                      {workspace.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {workspace.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{workspace.memberCount}</TableCell>
                  <TableCell>{workspace.taskCount}</TableCell>
                  <TableCell>
                    {workspace.dueDate
                      ? new Date(workspace.dueDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {workspace.deletedAt ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(workspace.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => redirect("show", "workspaces", workspace.id)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => redirect("edit", "workspaces", workspace.id)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {workspace.deletedAt ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const WorkspaceList = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workspaces</h1>
        <p className="text-muted-foreground mt-2">
          Manage all workspaces in the system
        </p>
      </div>
      <RaList>
        <WorkspaceListInner />
      </RaList>
    </div>
  );
};
