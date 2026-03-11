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
import { Textarea } from "@repo/design/components/ui/textarea";
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
  FormDescription,
} from "@repo/design/components/ui/form";
import { ArrowLeftIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  dueDateType: z.enum(["none", "fixed", "relative"]),
  dueDateValue: z.string().optional(),
  completionRule: z.enum(["any", "all"]),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  dueDateType: string;
  dueDateValue: string | null;
  completionRule: string;
}

interface TaskEditProps {
  taskId: string;
}

const taskTypeLabels: Record<string, string> = {
  FORM: "Form",
  ACKNOWLEDGEMENT: "Acknowledgement",
  TIME_BOOKING: "Time Booking",
  E_SIGN: "E-Sign",
  FILE_REQUEST: "File Request",
  APPROVAL: "Approval",
};

export const TaskEdit = ({ taskId }: TaskEditProps) => {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "not_started",
      dueDateType: "none",
      dueDateValue: "",
      completionRule: "all",
    },
  });

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/admin/tasks/${taskId}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch task");

        const result = await response.json();
        const data = result.data;

        if (data) {
          setTask(data);
          form.reset({
            title: data.title || "",
            description: data.description || "",
            status: data.status || "not_started",
            dueDateType: data.dueDateType || "none",
            dueDateValue: data.dueDateValue ? data.dueDateValue.split("T")[0] : "",
            completionRule: data.completionRule || "all",
          });
        }
      } catch (error) {
        console.error("Error fetching task:", error);
        toast.error("Failed to load task");
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, form]);

  const onSubmit = async (data: TaskFormValues) => {
    if (!task?.id) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          status: data.status,
          dueDateType: data.dueDateType,
          dueDateValue: data.dueDateType === "fixed" && data.dueDateValue ? data.dueDateValue : null,
          completionRule: data.completionRule,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update task");
      }

      toast.success("Task updated successfully");
      router.push("/dashboard/tasks");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const dueDateType = form.watch("dueDateType");

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading task...</span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Task not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard/tasks")}
            >
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Edit task</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/tasks")}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div>
              <CardTitle>Edit Task</CardTitle>
              <CardDescription>
                Update task details ({taskTypeLabels[task.type] || task.type})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Due Date</SelectItem>
                        <SelectItem value="fixed">Fixed Date</SelectItem>
                        <SelectItem value="relative">Relative (After Previous Task)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {dueDateType === "fixed" && (
                <FormField
                  control={form.control}
                  name="dueDateValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="completionRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Rule</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any assignee (first to complete)</SelectItem>
                        <SelectItem value="all">All assignees (everyone must complete)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines when the task is marked as complete
                    </FormDescription>
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
                  onClick={() => router.push("/dashboard/tasks")}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
