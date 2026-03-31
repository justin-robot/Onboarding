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

const createFromTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  inviteEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
});

type CreateFromTemplateFormValues = z.infer<typeof createFromTemplateSchema>;

interface Template {
  id: string;
  name: string;
  description: string | null;
  sectionCount: number;
  taskCount: number;
}

interface CreateFromTemplateDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newWorkspaceId: string) => void;
}

export const CreateFromTemplateDialog = ({
  template,
  open,
  onOpenChange,
  onSuccess,
}: CreateFromTemplateDialogProps) => {
  const [creating, setCreating] = useState(false);

  const form = useForm<CreateFromTemplateFormValues>({
    resolver: zodResolver(createFromTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      dueDate: "",
      inviteEmail: "",
    },
  });

  useEffect(() => {
    if (open && template) {
      form.reset({
        name: "",
        description: template.description || "",
        dueDate: "",
        inviteEmail: "",
      });
    }
  }, [open, template, form]);

  const onSubmit = async (data: CreateFromTemplateFormValues) => {
    if (!template) return;

    setCreating(true);
    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          templateId: template.id,
          name: data.name,
          description: data.description || null,
          dueDate: data.dueDate || null,
          inviteEmail: data.inviteEmail || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create workspace from template");
      }

      onOpenChange(false);
      if (onSuccess && result.workspaceId) {
        onSuccess(result.workspaceId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Workspace from Template</DialogTitle>
          <DialogDescription>
            Create a new workspace using the &quot;{template?.name}&quot; template.
            {template && (
              <span className="block mt-1 text-xs">
                This template includes {template.sectionCount} section{template.sectionCount !== 1 ? "s" : ""} and{" "}
                {template.taskCount} task{template.taskCount !== 1 ? "s" : ""}.
              </span>
            )}
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
                    <Input {...field} placeholder="e.g., Client Name - Project" />
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

            <FormField
              control={form.control}
              name="inviteEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invite User (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      placeholder="Enter email address to invite"
                    />
                  </FormControl>
                  <FormDescription>
                    This user will be invited and assigned to all tasks. The invitation is sent when the workspace is published.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Workspace"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
