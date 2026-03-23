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
import { ArrowLeftIcon, Loader2, CheckCircle2, Clock, Circle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    fetchUser();
    fetchTasks();
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
                        <Input {...field} />
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
                        <Input type="email" {...field} disabled className="bg-muted" />
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
                        <Input type="password" {...field} />
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
                          <SelectTrigger>
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
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/users")}
                    disabled={saving}
                  >
                    Cancel
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
                    <TableRow key={task.taskId}>
                      <TableCell className="font-medium">{task.title}</TableCell>
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
      </div>
    </div>
  );
};
