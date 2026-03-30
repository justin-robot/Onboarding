"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/design/components/ui/form";
import { Badge } from "@repo/design/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design/components/ui/table";
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
import { Progress } from "@repo/design/components/ui/progress";
import { ArrowLeftIcon, Loader2, CheckCircle2, Clock, Circle, ExternalLink, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  role: z.enum(["admin", "user"]).optional().nullable(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | null;
}

interface UserTask {
  taskId: string;
  title: string;
  type: string;
  taskStatus: string;
  assigneeStatus: string;
  dueDate: string | null;
  taskCompletedAt: string | null;
  assigneeCompletedAt: string | null;
  sectionTitle: string;
  workspaceId: string;
  workspaceName: string;
}

interface WorkspaceDetail {
  workspaceId: string;
  workspaceName: string;
  role: string;
  totalTasks: number;
  completedTasks: number;
}

interface UserEditProps {
  userId: string;
}

function getStatusBadge(taskStatus: string, assigneeStatus: string) {
  if (assigneeStatus === "completed") {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Completed
      </Badge>
    );
  }
  if (taskStatus === "in_progress") {
    return (
      <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">
        <Clock className="mr-1 h-3 w-3" />
        In Progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Circle className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  );
}

function formatTaskType(type: string) {
  const typeMap: Record<string, string> = {
    FORM: "Form",
    ACKNOWLEDGEMENT: "Acknowledgement",
    TIME_BOOKING: "Booking",
    E_SIGN: "E-Sign",
    FILE_REQUEST: "File Request",
    APPROVAL: "Approval",
  };
  return typeMap[type] || type;
}

export const UserEdit = ({ userId }: UserEditProps) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<Record<string, boolean>>({});

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: null,
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/admin/list-users", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch users");

        const data = await response.json();
        const foundUser = data.users?.find((u: User) => u.id === userId);

        if (foundUser) {
          setUser(foundUser);
          form.reset({
            name: foundUser.name || "",
            email: foundUser.email || "",
            password: "",
            role: foundUser.role || null,
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    const fetchTasks = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/tasks`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch tasks");

        const data = await response.json();
        setTasks(data.data || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setTasksLoading(false);
      }
    };

    const fetchWorkspaces = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/workspaces`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch workspaces");

        const data = await response.json();
        setWorkspaces(data.data || []);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setWorkspacesLoading(false);
      }
    };

    fetchUser();
    fetchTasks();
    fetchWorkspaces();
  }, [userId, form]);

  const onSubmit = async (data: UserFormValues) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const response = await fetch("/api/auth/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          data: {
            name: data.name,
            role: data.role,
            ...(data.password ? { password: data.password } : {}),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update user");
      }

      toast.success("User updated successfully");
      router.push("/dashboard/users");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user?.id) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/auth/admin/remove-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      router.push("/dashboard/users");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const updateMemberRole = async (workspaceId: string, newRole: string) => {
    setUpdatingRole((prev) => ({ ...prev, [workspaceId]: true }));
    try {
      const response = await fetch(`/api/admin/users/${userId}/workspaces/${workspaceId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.workspaceId === workspaceId ? { ...ws, role: newRole } : ws
          )
        );
        toast.success("Role updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole((prev) => ({ ...prev, [workspaceId]: false }));
    }
  };

  const handleTaskClick = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`);
  };

  const handleWorkspaceClick = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading user...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">User not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard/users")}
            >
              Back to Users
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.assigneeStatus === "completed").length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Edit user</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/users")}
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
              <div>
                <CardTitle>Edit User</CardTitle>
                <CardDescription>Update user information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="user-name-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled className="bg-muted" data-testid="user-email-input" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed as it is used for authentication
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password (leave blank to keep current)</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="user-password-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="user-role-selector">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} data-testid="save-user-btn">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/users")}
                    disabled={saving}
                    data-testid="cancel-user-btn"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={saving || deleting}
                    data-testid="delete-user-btn"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Tasks</CardTitle>
            <CardDescription>
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned
              {tasks.length > 0 && (
                <span className="ml-2">
                  ({completedCount} completed, {pendingCount} pending)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading tasks...</span>
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tasks assigned to this user
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow
                      key={task.taskId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleTaskClick(task.workspaceId)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {task.title}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatTaskType(task.type)}</Badge>
                      </TableCell>
                      <TableCell>{task.workspaceName}</TableCell>
                      <TableCell>{task.sectionTitle}</TableCell>
                      <TableCell>
                        {getStatusBadge(task.taskStatus, task.assigneeStatus)}
                      </TableCell>
                      <TableCell>
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspacesLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading workspaces...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No workspaces assigned to this user
              </p>
            ) : (
              <div className="grid gap-3">
                {workspaces.map((ws) => {
                  const isUpdating = updatingRole[ws.workspaceId];
                  const progressValue = ws.totalTasks > 0
                    ? (ws.completedTasks / ws.totalTasks) * 100
                    : 0;
                  return (
                    <div
                      key={ws.workspaceId}
                      className="flex items-center justify-between bg-muted/50 rounded-md px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-sm font-medium hover:underline flex items-center gap-1"
                          onClick={() => handleWorkspaceClick(ws.workspaceId)}
                        >
                          {ws.workspaceName}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 gap-1"
                              disabled={isUpdating}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Badge
                                variant={ws.role === "admin" ? "default" : "outline"}
                                className="text-xs pointer-events-none"
                              >
                                {ws.role}
                              </Badge>
                              {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMemberRole(ws.workspaceId, "admin");
                              }}
                              className="flex items-center justify-between"
                            >
                              Admin
                              {ws.role === "admin" && <Check className="h-4 w-4" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMemberRole(ws.workspaceId, "user");
                              }}
                              className="flex items-center justify-between"
                            >
                              User
                              {ws.role === "user" && <Check className="h-4 w-4" />}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={progressValue}
                          className="h-2 w-24"
                        />
                        <span className="text-xs text-muted-foreground">
                          {ws.completedTasks}/{ws.totalTasks}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{user.name}</strong> ({user.email})?
              This action cannot be undone. The user will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
