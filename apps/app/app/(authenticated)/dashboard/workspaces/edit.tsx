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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/design/components/ui/form";
import { ArrowLeftIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const workspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
}

interface WorkspaceEditProps {
  workspaceId: string;
}

export const WorkspaceEdit = ({ workspaceId }: WorkspaceEditProps) => {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      description: "",
      dueDate: "",
    },
  });

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const response = await fetch(`/api/admin/workspaces/${workspaceId}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch workspace");

        const result = await response.json();
        const data = result.data;

        if (data) {
          setWorkspace(data);
          form.reset({
            name: data.name || "",
            description: data.description || "",
            dueDate: data.dueDate ? data.dueDate.split("T")[0] : "",
          });
        }
      } catch (error) {
        console.error("Error fetching workspace:", error);
        toast.error("Failed to load workspace");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId, form]);

  const onSubmit = async (data: WorkspaceFormValues) => {
    if (!workspace?.id) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${workspace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          dueDate: data.dueDate || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update workspace");
      }

      toast.success("Workspace updated successfully");
      router.push("/dashboard/workspaces");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Workspace not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard/workspaces")}
            >
              Back to Workspaces
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
        <p className="text-muted-foreground mt-2">Edit workspace</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/workspaces")}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div>
              <CardTitle>Edit Workspace</CardTitle>
              <CardDescription>Update workspace details</CardDescription>
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
                name="dueDate"
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
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/workspaces")}
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
