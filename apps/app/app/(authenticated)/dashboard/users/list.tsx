"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Progress } from "@repo/design/components/ui/progress";
import { PlusIcon, SearchIcon, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: string;
  workspaceCount: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  lastActivity: string | null;
}

interface WorkspaceDetail {
  workspaceId: string;
  workspaceName: string;
  totalTasks: number;
  completedTasks: number;
}

export const UserList = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [workspaceDetails, setWorkspaceDetails] = useState<Record<string, WorkspaceDetail[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users/progress", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch users");

        const data = await response.json();
        setUsers(data.data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredData = searchValue
    ? users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchValue.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchValue.toLowerCase())
      )
    : users;

  const toggleUserExpand = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);

    // Load workspace details if not already loaded
    if (!workspaceDetails[userId]) {
      setLoadingDetails((prev) => ({ ...prev, [userId]: true }));
      try {
        const response = await fetch(`/api/admin/users/${userId}/workspaces`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setWorkspaceDetails((prev) => ({ ...prev, [userId]: data.data || [] }));
        }
      } catch (error) {
        console.error("Error fetching workspace details:", error);
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [userId]: false }));
      }
    }
  };

  const formatLastActivity = (date: string | null) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-2">
          Manage users and view task progress
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users</CardTitle>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/dashboard/users/create";
              }}
            >
              <PlusIcon className="size-4 mr-2" />
              Create User
            </Button>
          </div>
          <div className="mt-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading users...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[3%]"></TableHead>
                  <TableHead className="w-[15%]">Name</TableHead>
                  <TableHead className="w-[20%]">Email</TableHead>
                  <TableHead className="w-[10%]">Role</TableHead>
                  <TableHead className="w-[10%]">Workspaces</TableHead>
                  <TableHead className="w-[18%]">Task Progress</TableHead>
                  <TableHead className="w-[8%]">Overdue</TableHead>
                  <TableHead className="w-[10%]">Last Activity</TableHead>
                  <TableHead className="w-[6%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredData || filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((user) => (
                    <>
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.totalTasks > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleUserExpand(user.id)}
                            >
                              {expandedUserId === user.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{user.workspaceCount}</TableCell>
                        <TableCell>
                          {user.totalTasks > 0 ? (
                            <div className="flex items-center gap-2 min-w-32">
                              <Progress
                                value={(user.completedTasks / user.totalTasks) * 100}
                                className="h-2 flex-1"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {user.completedTasks}/{user.totalTasks}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.overdueTasks > 0 ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {user.overdueTasks}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatLastActivity(user.lastActivity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/dashboard/users/${user.id}`;
                            }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedUserId === user.id && (
                        <TableRow key={`${user.id}-details`}>
                          <TableCell colSpan={9} className="bg-muted/50 py-4">
                            {loadingDetails[user.id] ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Loading workspace details...
                                </span>
                              </div>
                            ) : workspaceDetails[user.id]?.length > 0 ? (
                              <div className="pl-10">
                                <h4 className="text-sm font-medium mb-3">Workspace Breakdown</h4>
                                <div className="grid gap-2">
                                  {workspaceDetails[user.id].map((ws) => (
                                    <div
                                      key={ws.workspaceId}
                                      className="flex items-center justify-between bg-background rounded-md px-3 py-2"
                                    >
                                      <span className="text-sm">{ws.workspaceName}</span>
                                      <div className="flex items-center gap-2">
                                        <Progress
                                          value={
                                            ws.totalTasks > 0
                                              ? (ws.completedTasks / ws.totalTasks) * 100
                                              : 0
                                          }
                                          className="h-2 w-24"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          {ws.completedTasks}/{ws.totalTasks}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="pl-10 text-sm text-muted-foreground">
                                No workspace details available
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
