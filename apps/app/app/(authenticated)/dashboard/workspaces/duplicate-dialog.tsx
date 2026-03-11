"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Textarea } from "@repo/design/components/ui/textarea";
import { Checkbox } from "@repo/design/components/ui/checkbox";
import { Label } from "@repo/design/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@repo/design/components/ui/form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const duplicateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assignToUsers: z.array(z.string()).optional(),
});

type DuplicateFormValues = z.infer<typeof duplicateSchema>;

interface User {
  id: string;
  name: string;
  email: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string | null;
}

interface DuplicateDialogProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newWorkspaceId: string) => void;
}

export const DuplicateDialog = ({
  workspace,
  open,
  onOpenChange,
  onSuccess,
}: DuplicateDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const form = useForm<DuplicateFormValues>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: {
      name: "",
      description: "",
      dueDate: "",
      assignToUsers: [],
    },
  });

  useEffect(() => {
    if (open && workspace) {
      form.reset({
        name: `${workspace.name} (Copy)`,
        description: workspace.description || "",
        dueDate: "",
        assignToUsers: [],
      });

      // Load users for assignment
      setLoadingUsers(true);
      fetch("/api/auth/admin/list-users", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setUsers(data.users || []))
        .catch((err) => console.error("Failed to load users:", err))
        .finally(() => setLoadingUsers(false));
    }
  }, [open, workspace, form]);

  const onSubmit = async (data: DuplicateFormValues) => {
    if (!workspace) return;

    setDuplicating(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${workspace.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          dueDate: data.dueDate || null,
          assignToUsers: data.assignToUsers,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to duplicate workspace");
      }

      toast.success("Workspace duplicated successfully");
      onOpenChange(false);
      if (onSuccess && result.workspaceId) {
        onSuccess(result.workspaceId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate workspace");
    } finally {
      setDuplicating(false);
    }
  };

  const selectedUsers = form.watch("assignToUsers") || [];

  const toggleUser = (userId: string) => {
    const current = form.getValues("assignToUsers") || [];
    if (current.includes(userId)) {
      form.setValue(
        "assignToUsers",
        current.filter((id) => id !== userId)
      );
    } else {
      form.setValue("assignToUsers", [...current, userId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicate Workspace</DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{workspace?.name}&quot; as a template for a new client.
            All sections, tasks, and configurations will be copied.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="New workspace name" />
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
                    <Textarea {...field} rows={2} placeholder="Optional description" />
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
                  <FormDescription>Optional due date for the new workspace</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Assign to Users (optional)</Label>
              <FormDescription>
                Selected users will be added as members and assigned to all tasks
              </FormDescription>
              {loadingUsers ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading users...</span>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No users available</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={duplicating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={duplicating}>
                {duplicating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Duplicating...
                  </>
                ) : (
                  "Duplicate Workspace"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
